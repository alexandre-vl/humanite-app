import { useLocalSearchParams } from 'expo-router';

/** The parameters of a route as it hands them over: strings, one or several under a name, or none at all. */
export type RawParams = Readonly<Record<string, string | readonly string[] | undefined>>;

/**
 * The parameters of the route a screen is showing, read by `read`.
 *
 * The reader is a function rather than a schema because the app may not declare zod — only the contracts package may.
 * What makes a screen validate is therefore the type it asks for: an identifier of the contracts is a branded string
 * that nothing but its own parser produces, so a screen that declares one cannot take it from a raw parameter, and a
 * malformed deep link throws in the parser and lands on the route's own error screen.
 */
export function useRouteParams<Params>(read: (raw: RawParams) => Params): Params {
  return read(useLocalSearchParams());
}
