import dedent from "ts-dedent";
import { parse } from "recast";
import { z } from "zod";

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/AsyncFunction
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const primativeSchema = z
	.string()
	.or(z.number())
	.or(z.boolean())
	.or(z.bigint())
	.or(z.date())
	.or(z.undefined())
	.or(z.null());

export type Primitive = z.infer<typeof primativeSchema>;

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
			result: Primitive | Promise<Primitive>;
	  } {
	try {
		const ast = parse(expression, {
			parser: require("recast/parsers/babel"),
		});

		const func = new (
			JSON.stringify(ast.program.body)?.includes("AwaitExpression")
				? AsyncFunction
				: Function
		)(
			...Object.keys(context).sort(),
			dedent(!isFunctionBody ? `return ${expression}` : expression)
		);

		const result = func(
			...Object.keys(context)
				.sort()
				.map((key) => context[key])
		) as Primitive | Promise<Primitive>;

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
