import {
	Editor,
	EventRef,
	MarkdownView,
	Plugin,
	TFile,
	request,
} from "obsidian";
import { DataviewApi, getAPI } from "obsidian-dataview";
import {
	Data,
	getDataFromFile,
	getDataFromTextSync,
	writeFile,
} from "./utils/obsidian";
import { extractSectionsFromPattern } from "./extractTextFromPattern";
import { evalFromExpression } from "./utils/evalFromExpression";
import { getNewTextFromResults } from "./getNewTextFromResults";

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
	private eventRefs: EventRef[] = [];
	private previousSaveCommand: () => void;
	private dv: DataviewApi | undefined;

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
			_Function: Function,
		};

		// this.dv?.markdownList
		const results = sections.map(({ startingTag, codeBlock }) => {
			return evalFromExpression(
				codeBlock
					? `_Function(
					"dv",
					"file",
					\`
					${codeBlock?.code}
				  \`
				  )`
					: startingTag,
				context
			);
		});

		const { resultedText: newText, remainingPromises } =
			getNewTextFromResults(data, results, sections, context);

		// if new text, write File
		if (newText !== data.text) {
			writeFile(editor, data.text, newText);
		}

		// for each remaining promise, update the text when it resolves
		remainingPromises.forEach(({ section, promise }) => {
			// the result should be a string
			promise.then((result) => {
				console.log(result, section);
				const data = getDataFromTextSync(editor.getValue());
				const { resultedText } = getNewTextFromResults(
					data,
					[{ success: true, result }],
					[section],
					context
				);
				writeFile(editor, data.text, resultedText);
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
				// const newText = data.text + "Loading...";
				// writeFile(editor, data.text, data.text + "Loading...");
				// request("https://www.google.com").then((text) => {
				// writeFile(editor, newText, data.text + text);
				// });

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
		this.dv = getAPI(this.app);
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
