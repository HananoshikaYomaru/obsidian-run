export type Section =
	| {
			startingTag: string;
			codeBlock?: {
				languageCode: string;
				code: string;
			};
			content: string;
			endingTag: string;
			endingObject: {
				[x: string]: string;
			};
			startMatch: RegExpMatchArray;
			endMatch: RegExpExecArray;
			text: string;
	  }
	| {
			startingTag: string;
			startMatch: RegExpMatchArray;
			text: string;
			codeBlock?: {
				languageCode: string;
				code: string;
			};
	  };

function mapStringToKeyValuePairs(inputString: string) {
	const lines = inputString.split("\n");
	const result: {
		[x: string]: string;
	} = {};

	lines.forEach((line) => {
		const index = line.indexOf(":");
		if (index !== -1) {
			const key = line.slice(0, index).trim();
			const value = line.slice(index + 1).trim();
			if (key && value) result[key] = value;
		}
	});

	return result;
}

// https://www.typescriptlang.org/play?target=99#code/FA4MwVwOwYwFwJYHsoAICmAPOAnAhvAMrrzJQDOAYjkgLYAKecc6OUAFC9gFyrm4IoAcwCUvAN584eHImEAVPEN78cgoQBpUMFCyhwVA4agA+qaABN0YQegtb0UC+sXKpa42cvXbF1AF8AbQBdVHFgVG0Ufj4SRGiJKRk5IVdDD00o-UcDd3VTcycfKDsHJxcldPyvIpsSvyDQgF5UEIBuEEidCjgk2UZmVjQWgHoAUjHUCwA3AFohRz64AB1yACp2QNXlwmC1gH4RCZGhDq7o3rwAGyuAWSYYAAt0clQmrjgAOloHx4BBG7sJYDFhsEQRLIxFgxFp-HD4ACenzANFoQOud1+L3BnVQYCQOFQQKu6F6CDeqAADKg2qhyQAeVDQr4k4RwR40ukAai5qBEYVQwAAkN0Yvxkvc4E8KczAghgsLRb0SthJdKWrLybyAIwKiHnHpLCpCCni2Rqx6BXWfARokQdfWQ3qOCwgoYU8aTGbzRYu1YbLbkHZ7Q7HU6Ol1utifK54fgASSKmFN0nNv0+gisyf2+ypqF5ZrgFsClOCMccQnZZ0iTowTgtFMjTFBUE+WBInCwcHtwpGI0hSBJMaQQiBTcG0djCaTqC0hYtGaTOJrdLARJdDYAhE0WlAIDdUAAyQ91iwLzNYVCMlVF377RdZ-nhUWD9DD0eni33i+YLQ389Jlo4IrgaMQusajb1r8Vplra7A9iBtbdHovQal2nzkFcCAwOg7DzumP41gWqa3lKlqluWbKPGUZ4EUuNpqHaDqIeQcRkOQnwAA4QOQjzsOEiGRIWxoaI6K7ITkvASfopg1FYdSlGJNbgQolSnhBJhycUdhKf4CE1v4GBXKxYRKX2qDxmu7KsOgdKvFASDqcY0iZLg6BMEyzxZChqB4E4Tkmi5vmvN4CkWEprGkNEXE8XxAmCcJqmaEpBoobwoW+KJgkBWkhTyb4un6ZE-gQiVuIQjgpIQGwsRRRQHRlcASpMl2FIAAbAAAxHgCAjAgPwLKg3UAEYjDAY3AAA7qw03TSAEyoAsJT4CwTJKK8haoBMXV4MNQ27WN+0IMAC1LawTC2S5rwultYzzV6cxLUst33VMj2LJtIAAMxcgALPdwAAOwnQ9PpoDdwBTr0ECcRYF28AATJSCNfbM2qUrMlLavICMI9wlIAKzcAjv2fAAnAjABsABaIOgK93pPZ9wA-f9dMg29YPPd9f0A8DC2M76-mQ3G0Ow-DqBIyjaMY1jON44TxOkxTNPswz71oJtNgksAXEyDkER6+yL3AB1TUXKglXkPuqEYNg+BEGx0TUHQUYcC12D8ubFCvu+7BWzbWgB1cLIVsbOLNeQeC0JxJIAEovDbFKBMKkjCkKiWpEoqC8AARKzueiUKIq6DkOeoLngO57OgrFypWduLnUPmOLLCI8jqPo5j2O4-jRMk+TVPU7nwr+EXafF5nrjl-nf3V1o6fSb06W1L4Nfp-X08r-l9Tr0KY+1xPGckRBecF0XJfZDJedV3vQqb2pTeiy3cNt5LHcy938t90rg80yP+8tBHyno-bW6Blitk4vrfQEDUBG0eIXWul80p5W0n4BeddyhJW3mg2uJUFRAA
export function extractSectionsFromPattern(text: string) {
	const sections: Section[] = [];

	const startPattern = /%% dv-gen start\s*([\s\S]*?)%%/g;
	const allMatches = text.matchAll(startPattern);
	const test = Array.from(allMatches);

	for (let i = 0; i < test.length; i++) {
		const startMatch = test[i]!;
		const nextMatch = test[i + 1];

		const startingTag = startMatch[1]?.trim() ?? "";

		const regex = /```(ts|js)\n([\s\S]*?)\n```/;
		const matches = regex.exec(startingTag);

		// check if it is a code block

		const codeBlock =
			matches && matches.length === 3
				? {
						languageCode: matches[1]!,
						code: matches[2]!,
				  }
				: undefined;

		const endPattern = /%% dv-gen end\s*([\s\S]*?)%%/g;
		endPattern.lastIndex = startMatch?.index ?? 0 + startMatch[0]?.length;
		const endMatch = endPattern.exec(text);

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
	return sections;
}
