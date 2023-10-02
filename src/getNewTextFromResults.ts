import { Data } from "./utils/obsidian";
import { Section } from "./extractTextFromPattern";
import {
	EvalResult,
	SanitizedObjectResult,
	Schema,
} from "./utils/evalFromExpression";
import dedent from "ts-dedent";
import { format } from "date-fns";
import { getEndingTag } from "./main";
import { createNotice } from "./createNotice";

export function getNewTextFromResults(
	data: Data,
	results: EvalResult[],
	sections: Section[]
) {
	let resultedText = data.text;

	const remainingPromises: { section: Section; promise: Promise<Schema> }[] =
		[];
	const errors: { section: Section; message: string }[] = [];

	for (let i = 0; i < results.length; i++) {
		const result = results[i]!;
		const section = sections[i]!;
		// for each success result, remove all the texts to corresponding end tag and replace it with the result
		if (result.success) {
			const content =
				result.result instanceof Promise ? "Loading..." : result.result;

			const newSectionText = dedent`
			%% dv-gen start ${section.id}
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
			if (result.result instanceof Promise) {
				remainingPromises.push({
					section: {
						...section,
						text: newSectionText,
					},
					promise: result.result,
				});
			}
		}

		// for each failed result, don't change anything between the start and end tag, but update the ending tag meta to include the error message
		else {
			resultedText = resultedText.replace(
				section.text,
				dedent`
			%% dv-gen start ${section.id}
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
			errors.push({
				section,
				message: result.error.message,
			});
		}
	}

	return { resultedText, remainingPromises, errors };
}
