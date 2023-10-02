// copied from https://github.com/platers/obsidian-linter/blob/master/src/utils/ignore-types.ts#L39

import {
	obsidianMultilineCommentRegex,
	tagWithLeadingWhitespaceRegex,
	wikiLinkRegex,
	yamlRegex,
	escapeDollarSigns,
	genericLinkRegex,
	urlRegex,
	anchorTagRegex,
	templaterCommandRegex,
	footnoteDefinitionIndicatorAtStartOfLine,
} from "./regex";
import {
	getAllCustomIgnoreSectionsInText,
	getPositions,
	MDAstTypes,
} from "./mdast";
import type { Position } from "unist";
import { replaceTextBetweenStartAndEndWithNewValue } from "./strings";
import { match, P } from "ts-pattern";

export type IgnoreResults = { replacedValues: string[]; newText: string };
export type IgnoreFunction = (
	text: string,
	placeholder: string
) => IgnoreResults;
export type IgnoreType = {
	replaceAction: MDAstTypes | RegExp | IgnoreFunction;
	placeholder: string;
};

export const IgnoreTypes: Record<string, IgnoreType> = {
	// mdast node types
	code: {
		replaceAction: MDAstTypes.Code,
		placeholder: "{CODE_BLOCK_PLACEHOLDER}",
	},
	inlineCode: {
		replaceAction: MDAstTypes.InlineCode,
		placeholder: "{INLINE_CODE_BLOCK_PLACEHOLDER}",
	},
	image: {
		replaceAction: MDAstTypes.Image,
		placeholder: "{IMAGE_PLACEHOLDER}",
	},
	thematicBreak: {
		replaceAction: MDAstTypes.HorizontalRule,
		placeholder: "{HORIZONTAL_RULE_PLACEHOLDER}",
	},
	italics: {
		replaceAction: MDAstTypes.Italics,
		placeholder: "{ITALICS_PLACEHOLDER}",
	},
	bold: {
		replaceAction: MDAstTypes.Bold,
		placeholder: "{STRONG_PLACEHOLDER}",
	},
	list: { replaceAction: MDAstTypes.List, placeholder: "{LIST_PLACEHOLDER}" },
	blockquote: {
		replaceAction: MDAstTypes.Blockquote,
		placeholder: "{BLOCKQUOTE_PLACEHOLDER}",
	},
	math: { replaceAction: MDAstTypes.Math, placeholder: "{MATH_PLACEHOLDER}" },
	inlineMath: {
		replaceAction: MDAstTypes.InlineMath,
		placeholder: "{INLINE_MATH_PLACEHOLDER}",
	},
	html: { replaceAction: MDAstTypes.Html, placeholder: "{HTML_PLACEHOLDER}" },
	// RegExp
	yaml: {
		replaceAction: yamlRegex,
		placeholder: escapeDollarSigns("---\n---"),
	},
	wikiLink: {
		replaceAction: wikiLinkRegex,
		placeholder: "{WIKI_LINK_PLACEHOLDER}",
	},
	obsidianMultiLineComments: {
		replaceAction: obsidianMultilineCommentRegex,
		placeholder: "{OBSIDIAN_COMMENT_PLACEHOLDER}",
	},
	footnoteAtStartOfLine: {
		replaceAction: footnoteDefinitionIndicatorAtStartOfLine,
		placeholder: "{FOOTNOTE_AT_START_OF_LINE_PLACEHOLDER}",
	},
	footnoteAfterATask: {
		replaceAction: /- \[.] (\[\^\w+\]) ?([,.;!:?])/gm,
		placeholder: "{FOOTNOTE_AFTER_A_TASK_PLACEHOLDER}",
	},
	url: { replaceAction: urlRegex, placeholder: "{URL_PLACEHOLDER}" },
	anchorTag: {
		replaceAction: anchorTagRegex,
		placeholder: "{ANCHOR_PLACEHOLDER}",
	},
	templaterCommand: {
		replaceAction: templaterCommandRegex,
		placeholder: "{TEMPLATER_PLACEHOLDER}",
	},
	// custom functions
	link: {
		replaceAction: replaceMarkdownLinks,
		placeholder: "{REGULAR_LINK_PLACEHOLDER}",
	},
	tag: { replaceAction: replaceTags, placeholder: "#tag-placeholder" },
	customIgnore: {
		replaceAction: replaceCustomIgnore,
		placeholder: "{CUSTOM_IGNORE_PLACEHOLDER}",
	},
} as const;

const isIgnoreFunction = (
	replaceAction: unknown
): replaceAction is IgnoreFunction => typeof replaceAction === "function";

export function ignoreListOfTypes(
	ignoreTypes: IgnoreType[],
	text: string,
	func: (text: string) => string
): string {
	let setOfPlaceholders: { placeholder: string; replacedValues: string[] }[] =
		[];

	// replace ignore blocks with their placeholders
	for (const ignoreType of ignoreTypes) {
		const ignoredResult = match(ignoreType.replaceAction)
			.with(P.string, (replaceAction) => {
				return replaceMdastType(
					text,
					ignoreType.placeholder,
					replaceAction
				);
			})
			.with(P.instanceOf(RegExp), (replaceAction) => {
				return replaceRegex(
					text,
					ignoreType.placeholder,
					replaceAction
				);
			})
			.with(P.when(isIgnoreFunction), (replaceAction) => {
				const ignoreFunc: IgnoreFunction = replaceAction;
				return ignoreFunc(text, ignoreType.placeholder);
			})
			.exhaustive();

		text = ignoredResult.newText;
		setOfPlaceholders.push({
			replacedValues: ignoredResult.replacedValues,
			placeholder: ignoreType.placeholder,
		});
	}

	text = func(text);

	setOfPlaceholders = setOfPlaceholders.reverse();
	// add back values that were replaced with their placeholders
	if (setOfPlaceholders != null && setOfPlaceholders.length > 0) {
		setOfPlaceholders.forEach(
			(replacedInfo: {
				placeholder: string;
				replacedValues: string[];
				replaceDollarSigns: boolean;
			}) => {
				replacedInfo.replacedValues.forEach((replacedValue: string) => {
					// Regex was added to fix capitalization issue  where another rule made the text not match the original place holder's case
					// see https://github.com/platers/obsidian-linter/issues/201
					text = text.replace(
						new RegExp(replacedInfo.placeholder, "i"),
						escapeDollarSigns(replacedValue)
					);
				});
			}
		);
	}

	return text;
}

/**
 * Replaces all mdast type instances in the given text with a placeholder.
 * @param {string} text The text to replace the given mdast node type in
 * @param {string} placeholder The placeholder to use
 * @param {MDAstTypes} type The type of node to ignore by replacing with the specified placeholder
 * @return {string} The text with mdast nodes types specified replaced
 * @return {string[]} The mdast nodes values replaced
 */
function replaceMdastType(
	text: string,
	placeholder: string,
	type: MDAstTypes
): IgnoreResults {
	const positions: Position[] = getPositions(type, text);
	const replacedValues: string[] = [];

	for (const position of positions) {
		const valueToReplace = text.substring(
			// @ts-ignore
			position.start.offset,
			position.end.offset
		);
		replacedValues.push(valueToReplace);
		text = replaceTextBetweenStartAndEndWithNewValue(
			text,
			// @ts-ignore
			position.start.offset,
			position.end.offset,
			placeholder
		);
	}

	// Reverse the replaced values so that they are in the same order as the original text
	replacedValues.reverse();

	return { newText: text, replacedValues };
}

/**
 * Replaces all regex matches in the given text with a placeholder.
 * @param {string} text The text to replace the regex matches in
 * @param {string} placeholder The placeholder to use
 * @param {RegExp} regex The regex to use to find what to replace with the placeholder
 * @return {string} The text with regex matches replaced
 * @return {string[]} The regex matches replaced
 */
function replaceRegex(
	text: string,
	placeholder: string,
	regex: RegExp
): IgnoreResults {
	const regexMatches = text.match(regex);
	const textMatches: string[] = [];
	if (regex.flags.includes("g")) {
		text = text.replaceAll(regex, placeholder);

		if (regexMatches) {
			for (const matchText of regexMatches) {
				textMatches.push(matchText);
			}
		}
	} else {
		text = text.replace(regex, placeholder);

		if (regexMatches) {
			textMatches.push(regexMatches[0]);
		}
	}

	return { newText: text, replacedValues: textMatches };
}

/**
 * Replaces all markdown links in the given text with a placeholder.
 * @param {string} text The text to replace links in
 * @param {string} regularLinkPlaceholder The placeholder to use for regular markdown links
 * @return {string} The text with links replaced
 * @return {string[]} The regular markdown links replaced
 */
function replaceMarkdownLinks(
	text: string,
	regularLinkPlaceholder: string
): IgnoreResults {
	const positions: Position[] = getPositions(MDAstTypes.Link, text);
	const replacedRegularLinks: string[] = [];

	for (const position of positions) {
		if (position == undefined) {
			continue;
		}

		const regularLink = text.substring(
			// @ts-ignore
			position.start.offset,
			position.end.offset
		);
		// skip links that are not in markdown format
		if (!regularLink.match(genericLinkRegex)) {
			continue;
		}

		replacedRegularLinks.push(regularLink);
		text = replaceTextBetweenStartAndEndWithNewValue(
			text,
			// @ts-ignore
			position.start.offset,
			position.end.offset,
			regularLinkPlaceholder
		);
	}

	// Reverse the regular links so that they are in the same order as the original text
	replacedRegularLinks.reverse();

	return { newText: text, replacedValues: replacedRegularLinks };
}

function replaceTags(text: string, placeholder: string): IgnoreResults {
	const replacedValues: string[] = [];

	text = text.replace(tagWithLeadingWhitespaceRegex, (_, whitespace, tag) => {
		replacedValues.push(tag);
		return whitespace + placeholder;
	});

	return { newText: text, replacedValues: replacedValues };
}

function replaceCustomIgnore(
	text: string,
	customIgnorePlaceholder: string
): IgnoreResults {
	const customIgnorePositions = getAllCustomIgnoreSectionsInText(text);

	const replacedSections: string[] = new Array(customIgnorePositions.length);
	let index = 0;
	const length = replacedSections.length;
	for (const customIgnorePosition of customIgnorePositions) {
		replacedSections[length - 1 - index++] = text.substring(
			customIgnorePosition.startIndex,
			customIgnorePosition.endIndex
		);
		text = replaceTextBetweenStartAndEndWithNewValue(
			text,
			customIgnorePosition.startIndex,
			customIgnorePosition.endIndex,
			customIgnorePlaceholder
		);
	}

	return { newText: text, replacedValues: replacedSections };
}
