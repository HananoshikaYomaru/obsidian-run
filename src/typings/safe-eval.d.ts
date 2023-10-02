declare module "safe-eval" {
	import { Context, RunningScriptOptions } from "vm";

	interface SafeEvalOptions extends RunningScriptOptions {}

	function safeEval(
		code: string,
		context?: Context,
		options?: SafeEvalOptions
	): any;

	export = safeEval;
}
