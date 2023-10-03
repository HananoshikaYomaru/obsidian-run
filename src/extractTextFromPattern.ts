import { Code } from "mdast-util-from-markdown/lib";
import { Prettify } from "./typings/prettify";
import { parseTextToAST } from "./utils/mdast";
import { mapStringToKeyValuePairs } from "./utils/strings";

const startPattern = /%% run start\s*([\s\S]*?)%%/g;
const codeBlockPattern = /```([\s\S]*?)\n([\s\S]*?)\n```/;
const endPattern = /%% run end\s*([\s\S]*?)%%/g;

export const extractCode = (text: string) => {
	const matches = new RegExp(codeBlockPattern).exec(text);
	if (matches) {
		const ast = parseTextToAST(text);
		const code = ast.children.find((c) => c.type === "code");
		if (code?.type === "code")
			return {
				meta: code.meta,
				languageCode: code.lang ?? "js",
				code: code.value,
			};
	}
	return undefined;
};

/**
 * @description
 * if the first word is a number, then it is an id.
 * remove the id and return the rest of the text
 * if the word is not a number, then simply return the text
 *
 * @example
 * "1 dv.pages().length" -> "dv.pages().length"
 * "1" -> "1"
 * "1 3+3" -> "3+3"
 *
 * @link
 * https://www.typescriptlang.org/play?target=99#code/MYewdgzgLgBApgDygJwIbCgSQCYwLwwAUUiUAXDNMgJZgDmAlPgHwwDeAUAJCiSwC2qKMAAWcCPhgkkAOkHCRhAPQA9QgB1sAagYaIOwgG11EdQGUAugCoGAEiUMA3N2oAzIvNHiYAMh8xPMQgZABs4eigRfDwCABYmTi4uZDgoAFdkMHZuJOpsCgAHVGQIOEwwKEJA8UMARgsAQgYAGhyuaXIAoS8IQwBmRtakgF9nLmHuFPTM7Nz8mDSwbDhXWjhsIfbSIdGOXY5eCBAw0JA6QngkNAwcQgAiWphsADcZIrpxQgZQ8LpIu6YDAO4COJxCZwupGuWGw91qAJgQMOxzgp3OlxQ6BhcJgfS0fQRSJBKLRkKuWNuDyer3en2+YQiUS0uJghKAA
 */
export const extractId = (text: string) => {
	const matches = text.match(/^(\d+)(\s+)([\s\S]*)$/);
	if (matches && matches.length === 4) {
		return {
			id: parseInt(matches[1]!),
			text: matches[3]!,
		};
	}
	return {
		id: undefined,
		text,
	};
};

export type SectionBaseData = {
	/**
	 * the id of this section
	 */
	id: number;
	/**
	 * the starting tag of this section
	 */
	startingTag: string;
	/**
	 * if the starting tag is a codeblock, this will be an object with the language code and the code
	 */
	codeBlock?: {
		languageCode: string;
		code: string;
	};
	/**
	 * the starting tag match
	 */
	startMatch: RegExpMatchArray;
	/**
	 * the text of the whole section
	 */
	text: string;
};

export type Section = Prettify<
	SectionBaseData &
		(
			| {
					/**
					 * the content of this section
					 */
					content: string;
					/**
					 * the ending tag of this section
					 */
					endingTag: string;
					/**
					 * the ending tag as an object
					 */
					endingObject: {
						[x: string]: string;
					};
					/**
					 * the ending tag match
					 */
					endMatch: RegExpExecArray;
			  }
			| {}
		)
>;

// https://www.typescriptlang.org/play?target=99#code/FA4MwVwOwYwFwJYHsoAICmAPOAnAhvAMrrzJQDOAYjkgLYAKecc6OUAFC9gFyrm4IoAcwCUvAN584eHImEAVPEN78cgoQBpUMFCyhwVA4agA+qaABN0YQegtb0UC+sXKpa42cvXbF1AF8AbQBdVHFgVG0Ufj4SRGiJKRk5IVdDD00o-UcDd3VTcycfKDsHJxcldPyvIpsSvyDQgF5UEIBuEEidCjgk2UZmVjQWgHoAUjHUCwA3AFohRz64AB1yACp2QNXlwmC1gH4RCZGhDq7o3rwAGyuAWSYYAAt0clQmrjgAOloHx4BBG7sJYDFhsEQRLIxFgxFp-HD4ACenzANFoQOud1+L3BnVQYCQOFQQKu6F6CDeqAADKg2qhyQAeVDQr4k4RwR40ukAai5qBEYVQwAAkN0Yvxkvc4E8KczAghgsLRb0SthJdKWrLybyAIwKiHnHpLCpCCni2Rqx6BXWfARokQdfWQ3qOCwgoYU8aTGbzRYu1YbLbkHZ7Q7HU6Ol1utifK54fgASSKmFN0nNv0+gisyf2+ypqF5ZrgFsClOCMccQnZZ0iTowTgtFMjTFBUE+WBInCwcHtwpGI0hSBJMaQQiBTcG0djCaTqC0hYtGaTOJrdLARJdDYAhE0WlAIDdUAAyQ91iwLzNYVCMlVF377RdZ-nhUWD9DD0eni33i+YLQ389Jlo4IrgaMQusajb1r8Vplra7A9iBtbdHovQal2nzkFcCAwOg7DzumP41gWqa3lKlqluWbKPGUZ4EUuNpqHaDqIeQcRkOQnwAA4QOQjzsOEiGRIWxoaI6K7ITkvASfopg1FYdSlGJNbgQolSnhBJhycUdhKf4CE1v4GBXKxYRKX2qDxmu7KsOgdKvFASDqcY0iZLg6BMEyzxZChqB4E4Tkmi5vmvN4CkWEprGkNEXE8XxAmCcJqmaEpBoobwoW+KJgkBWkhTyb4un6ZE-gQiVuIQjgpIQGwsRRRQHRlcASpMl2FIAAbAAAxHgCAjAgPwLKg3UAEYjDAY3AAA7qw03TSAEyoAsJT4CwTJKK8haoBMXV4MNQ27WN+0IMAC1LawTC2S5rwultYzzV6cxLUst33VMj2LJtIAAMxcgALPdwAAOwnQ9PpoDdwBTr0ECcRYF28AATJSCNfbM2qUrMlLavICMI9wlIAKzcAjv2fAAnAjABsABaIOgK93pPZ9wA-f9dMg29YPPd9f0A8DC2M76-mQ3G0Ow-DqBIyjaMY1jON44TxOkxTNPswz71oJtNgksAXEyDkER6+yL3AB1TUXKglXkPuqEYNg+BEGx0TUHQUYcC12D8ubFCvu+7BWzbWgB1cLIVsbOLNeQeC0JxJIAEovDbFKBMKkjCkKiWpEoqC8AARKzueiUKIq6DkOeoLngO57OgrFypWduLnUPmOLLCI8jqPo5j2O4-jRMk+TVPU7nwr+EXafF5nrjl-nf3V1o6fSb06W1L4Nfp-X08r-l9Tr0KY+1xPGckRBecF0XJfZDJedV3vQqb2pTeiy3cNt5LHcy938t90rg80yP+8tBHyno-bW6Blitk4vrfQEDUBG0eIXWul80p5W0n4BeddyhJW3mg2uJUFRAA
export function extractSectionsFromPattern(text: string) {
	const sections: Section[] = [];
	const sectionSummary: {
		[startingTag: string]: number;
	} = {};
	const allMatches = Array.from(text.matchAll(new RegExp(startPattern)));

	for (let i = 0; i < allMatches.length; i++) {
		const startMatch = allMatches[i]!;
		const nextMatch = allMatches[i + 1];
		const { text: startingTag } = extractId(startMatch[1]?.trim() ?? "");

		// if there is the same starting tag, id will be updated
		const id = (sectionSummary[startingTag] =
			(sectionSummary[startingTag] ?? 0) + 1);

		const codeBlock = extractCode(startingTag);

		const _endPattern = new RegExp(endPattern);
		_endPattern.lastIndex = startMatch.index ?? 0 + startMatch[0]?.length;
		const endMatch = _endPattern.exec(text);

		// check if there is an ending tag
		// it only has ending tag if the ending tag is before the next starting tag
		if (
			endMatch !== null &&
			(nextMatch === undefined || endMatch.index! < nextMatch.index!)
		) {
			const endingTag = endMatch[1]?.trim() ?? "";
			const content = text
				.slice(startMatch.index! + startMatch[0].length, endMatch.index)
				.trim();

			sections.push({
				startingTag,
				id,
				codeBlock,
				content: content,
				endingTag: endingTag,
				endingObject: mapStringToKeyValuePairs(endingTag),
				startMatch,
				endMatch,
				text: text.substring(
					startMatch.index!,
					endMatch.index! + endMatch[0].length
				),
			});
		} else {
			// If there is no ending tag, treat the content and ending tag as undefined
			sections.push({
				id,
				startingTag,
				startMatch,
				codeBlock,
				text: text.substring(
					startMatch.index!,
					startMatch.index! + startMatch[0].length
				),
			});
		}
	}
	return { sections, sectionSummary };
}

export type extractSectionsResult = ReturnType<
	typeof extractSectionsFromPattern
>;
