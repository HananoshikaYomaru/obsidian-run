import { TFile } from "obsidian";
import safeEval from "safe-eval";
import { z } from "zod";

const primativeSchema = z
	.string()
	.or(z.number())
	.or(z.boolean())
	.or(z.bigint())
	.or(z.date())
	.or(z.undefined())
	.or(z.null());

// const recursivePrmitiveSchema: z.ZodType<any> = z.lazy(() =>
// 	z.record(
// 		z.union([
// 			primativeSchema,
// 			recursivePrmitiveSchema,
// 			z.array(
// 				primativeSchema
// 					.or(recursivePrmitiveSchema)
// 					.or(z.array(primativeSchema))
// 			),
// 		])
// 	)
// );

type Schema = z.infer<typeof primativeSchema>;

export type SanitizedObject = Schema;

export type SanitizedObjectResult =
	| (() => Schema | Promise<Schema>)
	| Schema
	| Promise<Schema>;

export function evalFromExpression(
	expression: string,
	context: {
		[x: string]: any;
	}
):
	| {
			success: false;
			error: {
				cause?: Error;
				message: string;
			};
	  }
	// can be a function, a function to return promise, a promise or a primative
	| {
			success: true;
			result: SanitizedObjectResult;
	  } {
	try {
		const result = safeEval(expression, context);

		// for each value in object, make sure it pass the schema, if not, assign error message to the key in sanitizedObject
		// const sanitizedResult: SanitizedObject = primativeSchema.parse(object);

		return {
			success: true,
			result: result,
		} as const;
	} catch (e) {
		return {
			success: false,
			error: {
				cause: e as Error,
				message: e.message as string,
			},
		} as const;
	}
}

export type EvalResult = ReturnType<typeof evalFromExpression>;
