import dedent from "ts-dedent";
import { z } from "zod";

const primativeSchema = z
	.string()
	.or(z.number())
	.or(z.boolean())
	.or(z.bigint())
	.or(z.date())
	.or(z.undefined())
	.or(z.null());

export type Schema = z.infer<typeof primativeSchema>;

export type SanitizedObject = Schema;

export type SanitizedObjectResult = Schema | Promise<Schema>;

export function evalFromExpression(
	expression: string,
	isFunctionBody: boolean,
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
		const func = new Function(
			...Object.keys(context).sort(),
			dedent(!isFunctionBody ? `return ${expression}` : expression)
		);

		const result = func(
			...Object.keys(context)
				.sort()
				.map((key) => context[key])
		) as SanitizedObjectResult;

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
