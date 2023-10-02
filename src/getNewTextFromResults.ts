import { Data } from "./utils/obsidian";
import { Section } from "./extractTextFromPattern";
import { EvalResult, Primitive } from "./utils/evalFromExpression";
import dedent from "ts-dedent";
import { format } from "date-fns";

const getEndingTag = (
	generateEndingTagMetadata: boolean,
	section: Section,
	errorMessage?: string
) => {
	if (errorMessage)
		return dedent(
			generateEndingTagMetadata
				? `%% run end
	${_getEndingTag("endingTag" in section ? section.endingObject : {}, {
		error: errorMessage,
	})}
	%%`
				: `%% run end %%`
		);

	return dedent(
		generateEndingTagMetadata
			? `%% run end 
	${_getEndingTag(
		{},
		{
			"last update": format(new Date(), "yyyy-MM-dd HH:mm:ss"),
		}
	)}
	%%`
			: `%% run end %%`
	);
};

const _getEndingTag = (
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

export function getNewTextFromResults(
	data: Data,
	results: EvalResult[],
	sections: Section[],
	options?: {
		generateEndingTagMetadata?: boolean;
	}
) {
	let resultedText = data.text;

	const remainingPromises: {
		section: Section;
		promise: Promise<Primitive>;
	}[] = [];
	const errors: { section: Section; message: string }[] = [];

	for (let i = 0; i < results.length; i++) {
		const result = results[i]!;
		const section = sections[i]!;
		// for each success result, remove all the texts to corresponding end tag and replace it with the result
		if (result.success) {
			const content =
				result.result instanceof Promise ? "Loading..." : result.result;

			const newSectionText = dedent`
			%% run start ${section.id}
			${section.startingTag} 
			%%
			${content}
			${getEndingTag(Boolean(options?.generateEndingTagMetadata), section)}
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
			console.error(result.error.message);
			const newSectionText = dedent`
			%% run start ${section.id}
			${section.startingTag}
			%%
			${"content" in section ? section.content : ""}
			${getEndingTag(
				Boolean(options?.generateEndingTagMetadata),
				section,
				result.error.message
			)}
			`;
			resultedText = resultedText.replace(section.text, newSectionText);
			errors.push({
				section,
				message: result.error.message,
			});
		}
	}

	return { resultedText, remainingPromises, errors };
}
