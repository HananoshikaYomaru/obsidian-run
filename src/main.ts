import { Editor, MarkdownView, Plugin, TFile } from "obsidian";
import { getAPI } from "obsidian-dataview";
import {
	Data,
	getDataFromTextSync,
	isMarkdownFile,
	writeFile,
} from "./utils/obsidian";
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

const isIgnoredByFolder = (settings: RunPluginSettings, file: TFile) => {
	return settings.ignoredFolders.includes(file.parent?.path as string);
};

function isFileIgnored(settings: RunPluginSettings, file: TFile, data?: Data) {
	if (isIgnoredByFolder(settings, file)) return true;
	if (data) {
		if (data.yamlObj && data.yamlObj[YamlKey.IGNORE]) return true;
	}
	return false;
}

export type RunPluginSettings = {
	generateEndingTagMetadata: boolean;
	ignoredFolders: string[];
};

export const DEFAULT_SETTINGS: RunPluginSettings = {
	generateEndingTagMetadata: false,
	ignoredFolders: [],
};

export default class RunPlugin extends Plugin {
	settings: RunPluginSettings;

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
				this.app.plugins.plugins["templater-obsidian"] as
					| (Plugin & {
							templater: Templater;
					  })
					| undefined
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

	async onload() {
		await this.loadSettings();
		// this.registerEventsAndSaveCallback();
		this.addCommand({
			id: "run-file",
			name: "Run file",
			editorCheckCallback: this.runFile.bind(this),
		});

		this.addSettingTab(new SettingTab(this.app, this));
	}

	runFile(checking: boolean, editor: Editor, ctx: MarkdownView) {
		if (!ctx.file) return;
		if (checking) {
			return isMarkdownFile(ctx.file);
		}
		if (!editor) return;
		const data = getDataFromTextSync(editor.getValue());
		if (isFileIgnored(this.settings, ctx.file, data)) return;
		this.runFileSync(ctx.file, editor);
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
}
