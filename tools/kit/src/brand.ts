declare const brand: unique symbol;

/** A `Value` that only a validating function can produce: a plain `string` is not assignable to `Brand<string, 'X'>`. */
export type Brand<Value, Name extends string> = Value & Readonly<{ [brand]: Name }>;
