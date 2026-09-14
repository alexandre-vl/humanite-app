import type { Href } from 'expo-router';

type Expect<Condition extends true> = Condition;

/**
 * Compiles only when the route types Expo generates belong to the project: without them `Href` accepts any string, and
 * a link to a route that does not exist type-checks.
 *
 * @public
 */
export type TypedRoutesGenerated = Expect<string extends Extract<Href, string> ? false : true>;
