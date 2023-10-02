import { Editor, EventRef, MarkdownView, Plugin, TFile } from "obsidian";
import { DataviewApi, getAPI } from "obsidian-dataview";
import { Data, getDataFromTextSync, writeFile } from "./utils/obsidian";
import { extractSectionsFromPattern } from "./extractTextFromPattern";
import { evalFromExpression } from "./utils/evalFromExpression";
import { getNewTextFromResults } from "./getNewTextFromResults";
import dedent from "ts-dedent";
import { createNotice } from "./createNotice";

enum YamlKey {
	IGNORE = "dv-gen-ignore",
}

export const getEndingTag = (
	endingObject: { [x: string]: string },
	newObject: { [x: string]: string }
) => {
	const test = {
		...endingObject,
		...newObject,
	};

	// convert the object to string
	const string = Object.entries(test)
		.map(([key, value]) => `${key}: ${value}`)
		.join("\n");
	return string;
};

function isFileIgnored(file: TFile, data?: Data) {
	if (data) {
		if (data.yamlObj && data.yamlObj[YamlKey.IGNORE]) return true;
	}
	return false;
}

export default class DvGeneratorPlugin extends Plugin {
	private previousSaveCommand: () => void;

	runFileSync(file: TFile, editor: Editor) {
		const data = getDataFromTextSync(editor.getValue());
		// recognise the patterns

		const sections = extractSectionsFromPattern(data.text);
		// eval all the expressions

		const context = {
			file: {
				...file,
				properties: data.yamlObj,
			},
			dv: getAPI(this.app),
		};

		const results = sections.map(({ startingTag, codeBlock }) => {
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
		} = getNewTextFromResults(data, results, sections);

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
						[section]
					);
					writeFile(editor, data.text, resultedText);
				})
				.catch((e) => {
					console.error(e);
					createNotice(
						`Error when resolving run ${section.id}: ${e.message}`,
						"red"
					);
				});
		});
	}

	registerEventsAndSaveCallback() {
		const saveCommandDefinition =
			this.app.commands.commands["editor:save-file"];
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
				this.previousSaveCommand();

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
		this.registerEventsAndSaveCallback();
	}

	onunload() {
		this.unregisterEventsAndSaveCallback();
	}

	unregisterEventsAndSaveCallback() {
		const saveCommandDefinition =
			this.app.commands.commands["editor:save-file"];
		saveCommandDefinition.callback = this.previousSaveCommand;
	}
}
