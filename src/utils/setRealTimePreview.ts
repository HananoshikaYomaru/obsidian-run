import { EvalResult } from "./evalFromExpression";

export const setRealTimePreview = (
	element: HTMLElement,
	result: EvalResult,
	context?: {
		[x: string]: any;
	}
) => {
	if (!result.success) {
		console.error(result.error.cause);
		// this is needed so that it is easier to debug
		if (context) console.log(context);
		element.innerHTML = result.error.message;
		element.style.color = "red";
	} else {
		// there is object
		// set the real time preview
		element.innerHTML = JSON.stringify(result.result, null, 2);
		element.style.color = "white";
	}
};
