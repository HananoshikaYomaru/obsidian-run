import { Editor, MarkdownView, Plugin, TFile } from "obsidian";
import { getAPI } from "obsidian-dataview";
import { Data, getDataFromTextSync, writeFile } from "./utils/obsidian";
import { extractSectionsFromPattern } from "./extractTextFromPattern";
import { evalFromExpression } from "./utils/evalFromExpression";
import { getNewTextFromResults } from "./getNewTextFromResults";
import dedent from "ts-dedent";
import { createNotice } from "./createNotice";
import { SettingTab } from "./ui/settingsTab";
import { Templater } from "./typings/templater";

enum YamlKey {
	IGNORE = "run-ignore",
}

function isFileIgnored(file: TFile, data?: Data) {
	if (data) {
		if (data.yamlObj && data.yamlObj[YamlKey.IGNORE]) return true;
	}
	return false;
}

export type RunPluginSettings = {
	generateEndingTagMetadata: boolean;
};

export const DEFAULT_SETTINGS: RunPluginSettings = {
	generateEndingTagMetadata: false,
};

export default class RunPlugin extends Plugin {
	settings: RunPluginSettings;
	private previousSaveCommand: (() => void) | undefined;

	runFileSync(file: TFile, editor: Editor) {
		const data = getDataFromTextSync(editor.getValue());
		// recognise the patterns

		const s = extractSectionsFromPattern(data.text);

		// if no sections, we can return early
		if (s.sections.length === 0) return;

		// eval all the expressions
		const context = {
			file: {
				...file,
				properties: data.yamlObj,
			},
			dv: getAPI(this.app),
			tp: (
				this.app.plugins.plugins["templater-obsidian"] as Plugin & {
					templater: Templater;
				}
			)?.templater.current_functions_object,
		};

		const results = s.sections.map(({ startingTag, codeBlock }) => {
			return evalFromExpression(
				codeBlock ? codeBlock.code : startingTag,
				codeBlock ? true : false,
				context
			);
		});

		const {
			resultedText: newText,
			remainingPromises,
			errors,
		} = getNewTextFromResults(data, results, s, {
			generateEndingTagMetadata: this.settings.generateEndingTagMetadata,
		});

		// if new text, write File
		if (newText !== data.text) {
			writeFile(editor, data.text, newText);
		}

		// for each remaining promise, update the text when it resolves
		remainingPromises.forEach(({ section, promise }) => {
			// the result should be a string
			promise
				.then((result) => {
					const data = getDataFromTextSync(editor.getValue());
					const { resultedText } = getNewTextFromResults(
						data,
						[{ success: true, result }],
						{
							sections: [section],
							sectionSummary: s.sectionSummary,
						},
						{
							generateEndingTagMetadata:
								this.settings.generateEndingTagMetadata,
						}
					);
					writeFile(editor, data.text, resultedText);
				})
				.catch((e) => {
					console.error(e);
					const { resultedText } = getNewTextFromResults(
						data,
						[
							{
								success: false,
								error: { message: e.message, cause: e },
							},
						],
						{
							sections: [section],
							sectionSummary: s.sectionSummary,
						},
						{
							generateEndingTagMetadata:
								this.settings.generateEndingTagMetadata,
						}
					);
					writeFile(editor, data.text, resultedText);
					createNotice(
						`Error when resolving run ${section.id}: ${e.message}`,
						"red"
					);
				});
		});

		createNotice(
			dedent`
		Completed: ${
			results.length - errors.length - remainingPromises.length
		} out of ${results.length}
		Promise: ${remainingPromises.length}
		Error: ${errors.length}
		`,
			errors.length > 0 ? "red" : "white"
		);
	}

	registerEventsAndSaveCallback() {
		const saveCommandDefinition =
			this.app.commands.commands["editor:save-file"]!;
		this.previousSaveCommand = saveCommandDefinition.callback;

		if (typeof this.previousSaveCommand === "function") {
			saveCommandDefinition.callback = () => {
				// get the editor and file
				const editor =
					this.app.workspace.getActiveViewOfType(
						MarkdownView
					)?.editor;
				const file = this.app.workspace.getActiveFile();
				if (!editor || !file) return;
				const data = getDataFromTextSync(editor.getValue());
				if (isFileIgnored(file, data)) return;

				// this cannot be awaited because it will cause the editor to delay saving
				this.runFileSync(file, editor);

				// run the previous save command
				if (this.previousSaveCommand) this.previousSaveCommand();

				// defines the vim command for saving a file and lets the linter run on save for it
				// accounts for https://github.com/platers/obsidian-linter/issues/19
				const that = this;
				window.CodeMirrorAdapter.commands.save = () => {
					that.app.commands.executeCommandById("editor:save-file");
				};
			};
		}
	}

	async onload() {
		await this.loadSettings();
		this.registerEventsAndSaveCallback();
		this.addSettingTab(new SettingTab(this.app, this));
	}

	onunload() {
		this.unregisterEventsAndSaveCallback();
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}
	unregisterEventsAndSaveCallback() {
		const saveCommandDefinition =
			this.app.commands.commands["editor:save-file"]!;
		saveCommandDefinition.callback = this.previousSaveCommand;
	}
}
