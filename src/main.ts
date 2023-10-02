import { Editor, EventRef, MarkdownView, Plugin, TFile } from "obsidian";
import { DataviewApi, getAPI } from "obsidian-dataview";
import {
	Data,
	getDataFromFile,
	getDataFromTextSync,
	writeFile,
} from "./utils/obsidian";
import { Section, extractSectionsFromPattern } from "./extractTextFromPattern";
import { EvalResult, evalFromExpression } from "./utils/evalFromExpression";
import dedent from "ts-dedent";

const formatter = new Intl.DateTimeFormat("en", {
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
});

enum YamlKey {
	IGNORE = "dv-gen-ignore",
}

const getEndingTag = (
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

const injectStringByIndex = (str: string, index: number, inject: string) => {
	return str.slice(0, index) + inject + str.slice(index);
};

const removeSubstringByIndices = (str: string, start: number, end: number) => {
	return str.slice(0, start) + str.slice(end);
};

function getNewTextFromResults(
	data: Data,
	results: EvalResult[],
	sections: Section[]
) {
	let resultedText = data.text;

	for (let i = 0; i < results.length; i++) {
		const result = results[i]!;
		const section = sections[i]!;
		// for each success result, remove all the texts the corresponding end tag and replace it with the result
		if (result.success) {
			// console.log(section.text);
			// inject the result string to the text
			resultedText = resultedText.replace(
				section.text,
				dedent`
			%% dv-gen start 
			${section.startingTag} 
			%%
			${result.result}
			%% dv-gen end 
			${getEndingTag(
				{},
				{
					"last update": formatter.format(new Date()),
				}
			)}
			%%
			`
			);
		}
		// for each failed result, don't change anything between the start and end tag, but update the ending tag meta to include the error message
		else {
			resultedText = resultedText.replace(
				section.text,
				dedent`
			%% dv-gen start
			${section.startingTag}
			%%
			${"content" in section ? section.content : ""}
			%% dv-gen end
			${getEndingTag("endingTag" in section ? section.endingObject : {}, {
				error: result.error.message,
			})}
			%%
			`
			);
		}
	}
	return resultedText;
}

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

		const results = sections.map(({ startingTag, codeBlock }) => {
			return evalFromExpression(
				codeBlock ? codeBlock.code : startingTag,
				{
					file: {
						...file,
						properties: data.yamlObj,
					},
					dv: getAPI(this.app),
				}
			);
		});

		const newText = getNewTextFromResults(data, results, sections);
		console.log(newText);
		// compose new text

		// if new text, write File
		if (newText) {
			writeFile(editor, data.text, newText);
		}
	}

	registerEventsAndSaveCallback() {
		const saveCommandDefinition =
			this.app.commands.commands["editor:save-file"];
		this.previousSaveCommand = saveCommandDefinition.callback;

		if (typeof this.previousSaveCommand === "function") {
			saveCommandDefinition.callback = async () => {
				// get the editor and file
				const editor =
					this.app.workspace.getActiveViewOfType(
						MarkdownView
					)?.editor;
				const file = this.app.workspace.getActiveFile();
				if (!editor || !file) return;
				const data = await getDataFromFile(this, file);
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
