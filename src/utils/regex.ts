import { makeSureContentHasEmptyLinesAddedBeforeAndAfter } from "./strings";

// Useful regexes
export const allHeadersRegex = /^([ \t]*)(#+)([ \t]+)([^\n\r]*?)([ \t]+#+)?$/gm;
export const fencedRegexTemplate =
	"^XXX\\.*?\n(?:((?:.|\n)*?)\n)?XXX(?=\\s|$)$";
export const yamlRegex = /^---\n((?:(((?!---)(?:.|\n)*?)\n)?))---(?=\n|$)/;
export const backtickBlockRegexTemplate = fencedRegexTemplate.replaceAll(
	"X",
	"`"
);
export const tildeBlockRegexTemplate = fencedRegexTemplate.replaceAll("X", "~");
export const indentedBlockRegex = "^((\t|( {4})).*\n)+";
export const codeBlockRegex = new RegExp(
	`${backtickBlockRegexTemplate}|${tildeBlockRegexTemplate}|${indentedBlockRegex}`,
	"gm"
);
// based on https://stackoverflow.com/a/26010910/8353749
export const wikiLinkRegex =
	/(!?)\[{2}([^\][\n|]+)(\|([^\][\n|]+))?(\|([^\][\n|]+))?\]{2}/g;
// based on https://davidwells.io/snippets/regex-match-markdown-links
export const genericLinkRegex = /(!?)\[([^[]*)\](\(.*\))/g;
export const tagWithLeadingWhitespaceRegex = /(\s|^)(#[^\s#;.,><?!=+]+)/g;
export const obsidianMultilineCommentRegex = /^%%\n[^%]*\n%%/gm;
export const wordSplitterRegex = /[,\s]+/;
export const ellipsisRegex = /(\. ?){2}\./g;
export const lineStartingWithWhitespaceOrBlockquoteTemplate = `\\s*(>\\s*)*`;
export const tableSeparator =
	/(\|? *:?-{1,}:? *\|?)(\| *:?-{1,}:? *\|?)*( |\t)*$/gm;
export const tableStartingPipe = /^(((>[ ]?)*)|([ ]{0,3}))\|/m;
export const tableRow = /[^\n]*?\|[^\n]*?(\n|$)/m;
// based on https://gist.github.com/skeller88/5eb73dc0090d4ff1249a
export const simpleURIRegex =
	/(([a-z\-0-9]+:)\/{2})([^\s/?#]*[^\s")'.?!/]|[/])?(([/?#][^\s")']*[^\s")'.?!])|[/])?/gi;
// generated from https://github.com/spamscanner/url-regex-safe using strict: true, returnString: true, and re2: false as options
export const urlRegex =
	/(?:(?:(?:[a-z]+:)?\/\/)|www\.)(?:localhost|(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?:(?:[a-fA-F\d]{1,4}:){7}(?:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,2}|:)|(?:[a-fA-F\d]{1,4}:){4}(?:(?::[a-fA-F\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,3}|:)|(?:[a-fA-F\d]{1,4}:){3}(?:(?::[a-fA-F\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,4}|:)|(?:[a-fA-F\d]{1,4}:){2}(?:(?::[a-fA-F\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,5}|:)|(?:[a-fA-F\d]{1,4}:){1}(?:(?::[a-fA-F\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,6}|:)|(?::(?:(?::[a-fA-F\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,7}|:)))(?:%[0-9a-zA-Z]{1,})?|(?:(?:[a-z\u00a1-\uffff0-9][-_]*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:(?:[/?#][^\s")']*[^\s")'.?!])|[/])?/gi;
export const anchorTagRegex = /<a[\s]+([^>]+)>((?:.(?!<\/a>))*.)<\/a>/g;
export const wordRegex = /[\p{L}\p{N}\p{Pc}\p{M}\-'’`]+/gu;
// regex from https://stackoverflow.com/a/26128757/8353749
export const htmlEntitiesRegex = /&[^\s]+;$/im;

export const customIgnoreAllStartIndicator =
	generateHTMLLinterCommentWithSpecificTextAndWhitespaceRegexMatch(true);
export const customIgnoreAllEndIndicator =
	generateHTMLLinterCommentWithSpecificTextAndWhitespaceRegexMatch(false);

export const smartDoubleQuoteRegex = /[“”„«»]/g;
export const smartSingleQuoteRegex = /[‘’‚‹›]/g;

export const templaterCommandRegex = /<%[^]*?%>/g;
// checklist regex
export const checklistBoxIndicator = "\\[.\\]";
export const checklistBoxStartsTextRegex = new RegExp(
	`^${checklistBoxIndicator}`
);
export const indentedOrBlockquoteNestedChecklistIndicatorRegex = new RegExp(
	`^${lineStartingWithWhitespaceOrBlockquoteTemplate}- ${checklistBoxIndicator} `
);
export const nonBlockquoteChecklistRegex = new RegExp(
	`^\\s*- ${checklistBoxIndicator} `
);

export const footnoteDefinitionIndicatorAtStartOfLine =
	/^(\[\^\w+\]) ?([,.;!:?])/gm;
export const calloutRegex = /^(>\s*)+\[![^\s]*\]/m;

// https://stackoverflow.com/questions/38866071/javascript-replace-method-dollar-signs
// Important to use this for any regex replacements where the replacement string
// could have user constructed dollar signs in it
export function escapeDollarSigns(str: string): string {
	return str.replace(/\$/g, "$$$$");
}

// https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
export function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

/**
 * Removes spaces from around the wiki link text
 * @param {string} text The text to remove the space from around wiki link text
 * @return {string} The text without space around wiki link link text
 */
export function removeSpacesInWikiLinkText(text: string): string {
	const linkMatches = text.match(wikiLinkRegex);
	if (linkMatches) {
		for (const link of linkMatches) {
			// wiki link with link text
			if (link.includes("|")) {
				const startLinkTextPosition = link.indexOf("|");
				const newLink =
					link.substring(0, startLinkTextPosition + 1) +
					link
						.substring(startLinkTextPosition + 1, link.length - 2)
						.trim() +
					"]]";
				text = text.replace(link, newLink);
			}
		}
	}

	return text;
}

/**
 * Gets the first header one's text from the string provided making sure to convert any links to their display text.
 * @param {string} text - The text to have get the first header one's text from.
 * @return {string} The text for the first header one if present or an empty string.
 */
export function getFirstHeaderOneText(text: string): string {
	const result = text.match(/^#\s+(.*)/m);
	if (result && result[1]) {
		let headerText = result[1];
		headerText = headerText.replaceAll(
			wikiLinkRegex,
			(_, _2, $2: string, $3: string) => {
				if ($3 != null) {
					return $3.replace("|", "");
				}

				return $2;
			}
		);

		return headerText.replaceAll(genericLinkRegex, "$2");
	}

	return "";
}

export function matchTagRegex(text: string): string[] {
	// @ts-ignore
	return [...text.matchAll(tagWithLeadingWhitespaceRegex)].map(
		(match) => match[2]
	);
}

export function generateHTMLLinterCommentWithSpecificTextAndWhitespaceRegexMatch(
	isStart: boolean
): RegExp {
	const regexTemplate = "<!-{2,} *linter-{ENDING_TEXT} *-{2,}>";
	let endingText = "";

	if (isStart) {
		endingText += "disable";
	} else {
		endingText += "enable";
	}

	return new RegExp(regexTemplate.replace("{ENDING_TEXT}", endingText), "g");
}
