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
