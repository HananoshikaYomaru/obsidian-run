import { visit } from "unist-util-visit";
import type { Position } from "unist";
import type { Root } from "mdast";
import {
	hashString53Bit,
	makeSureContentHasEmptyLinesAddedBeforeAndAfter,
	replaceTextBetweenStartAndEndWithNewValue,
	getStartOfLineIndex,
	replaceAt,
	countInstances,
} from "./strings";
import {
	genericLinkRegex,
	tableRow,
	tableSeparator,
	tableStartingPipe,
	customIgnoreAllStartIndicator,
	customIgnoreAllEndIndicator,
	checklistBoxStartsTextRegex,
	footnoteDefinitionIndicatorAtStartOfLine,
} from "./regex";
import { gfmFootnote } from "micromark-extension-gfm-footnote";
import { gfmTaskListItem } from "micromark-extension-gfm-task-list-item";
import { combineExtensions } from "micromark-util-combine-extensions";
import { math } from "micromark-extension-math";
import { mathFromMarkdown } from "mdast-util-math";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFootnoteFromMarkdown } from "mdast-util-gfm-footnote";
import { gfmTaskListItemFromMarkdown } from "mdast-util-gfm-task-list-item";
import QuickLRU from "quick-lru";

const LRU = new QuickLRU({ maxSize: 200 });

export enum MDAstTypes {
	Link = "link",
	Footnote = "footnoteDefinition",
	Paragraph = "paragraph",
	Italics = "emphasis",
	Bold = "strong",
	ListItem = "listItem",
	Code = "code",
	InlineCode = "inlineCode",
	Image = "image",
	List = "list",
	Blockquote = "blockquote",
	HorizontalRule = "thematicBreak",
	Html = "html",
	// math types
	Math = "math",
	InlineMath = "inlineMath",
}

function parseTextToAST(text: string): Root {
	const textHash = hashString53Bit(text);
	if (LRU.has(textHash)) {
		return LRU.get(textHash) as Root;
	}

	const ast = fromMarkdown(text, {
		extensions: [
			combineExtensions([gfmFootnote(), gfmTaskListItem]),
			math(),
		],
		mdastExtensions: [
			[gfmFootnoteFromMarkdown(), gfmTaskListItemFromMarkdown],
			mathFromMarkdown(),
		],
	});

	LRU.set(textHash, ast);

	return ast;
}

/**
 * Gets the positions of the given element type in the given text.
 * @param {string} type - The element type to get positions for
 * @param {string} text - The markdown text
 * @return {Position[]} The positions of the given element type in the given text
 */
export function getPositions(type: MDAstTypes, text: string): Position[] {
	const ast = parseTextToAST(text);
	const positions: Position[] = [];
	visit(ast, type as string, (node) => {
		// @ts-ignore
		positions.push(node.position);
	});

	// Sort positions by start position in reverse order
	// @ts-ignore
	positions.sort((a, b) => b.start.offset - a.start.offset);
	return positions;
}

export function getAllCustomIgnoreSectionsInText(
	text: string
): { startIndex: number; endIndex: number }[] {
	const positions: { startIndex: number; endIndex: number }[] = [];
	const startMatches = [...text.matchAll(customIgnoreAllStartIndicator)];
	if (!startMatches || startMatches.length === 0) {
		return positions;
	}

	const endMatches = [...text.matchAll(customIgnoreAllEndIndicator)];

	let iteratorIndex = 0;
	startMatches.forEach((startMatch) => {
		// @ts-ignore
		iteratorIndex = startMatch.index;

		let foundEndingIndicator = false;
		let endingPosition = text.length - 1;
		// eslint-disable-next-line no-unmodified-loop-condition -- endMatches does not need to be modified with regards to being undefined or null
		while (endMatches && endMatches.length !== 0 && !foundEndingIndicator) {
			// @ts-ignore
			if (endMatches[0].index <= iteratorIndex) {
				endMatches.shift();
			} else {
				foundEndingIndicator = true;

				const endingIndicator = endMatches[0];
				endingPosition =
					// @ts-ignore
					endingIndicator.index + endingIndicator[0].length;
			}
		}

		positions.push({
			startIndex: iteratorIndex,
			endIndex: endingPosition,
		});

		if (!endMatches || endMatches.length === 0) {
			return;
		}
	});

	return positions.reverse();
}
