import { Data } from "./utils/obsidian";
import { Section } from "./extractTextFromPattern";
import { EvalResult, SanitizedObjectResult } from "./utils/evalFromExpression";
import dedent from "ts-dedent";
import { format } from "date-fns";
import { getEndingTag } from "./main";

function getContentFromResult(result: SanitizedObjectResult, context: any) {
	if (typeof result === "function") {
		// @ts-ignore
		const temp = result(context.dv, context.file);
		// const temp = result();
		// check if it is a promise
		return temp;
	} else {
		return result;
	}
}

export function getNewTextFromResults(
	data: Data,
	results: EvalResult[],
	sections: Section[],
	context: any
) {
	let resultedText = data.text;
	const remainingPromises: { section: Section; promise: Promise<any> }[] = [];

	for (let i = 0; i < results.length; i++) {
		const result = results[i]!;
		const section = sections[i]!;
		// for each success result, remove all the texts to corresponding end tag and replace it with the result
		if (result.success) {
			const execResult = getContentFromResult(result.result, context);

			const content =
				execResult instanceof Promise ? "Loading..." : execResult;

			console.log(content, section.text);
			const newSectionText = dedent`
			%% dv-gen start 
			${section.startingTag} 
			%%
			${content}
			%% dv-gen end 
			${getEndingTag(
				{},
				{
					"last update": format(new Date(), "yyyy-MM-dd HH:mm:ss"),
				}
			)}
			%%
			`;
			resultedText = resultedText.replace(section.text, newSectionText);
			if (execResult instanceof Promise) {
				remainingPromises.push({
					section: {
						...section,
						text: newSectionText,
					},
					promise: execResult,
				});
			}
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
	return { resultedText, remainingPromises };
}
