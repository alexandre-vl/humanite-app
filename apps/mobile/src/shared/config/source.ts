/**
 * Where the app reads the paper from: the corpus it carries, or the journal's own service.
 *
 * It is chosen when the app is built, by `EXPO_PUBLIC_CONTENT_SOURCE`, and a build nobody chose for reads the corpus:
 * the tests, the flows the emulator runs and every build nobody asked for reach no network. A value the list does not
 * hold stops the app at its first line, rather than letting it read one source while its builder meant the other.
 */
const CONTENT_SOURCES = ['mock', 'service'] as const;

/** A source the app can read the paper from. */
export type ContentSource = (typeof CONTENT_SOURCES)[number];

/**
 * The one variable this module reads, declared as the app reads it rather than with all of Node's `process`: Expo
 * writes `process.env.EXPO_PUBLIC_…` into the bundle when it is built, and nothing else of `process` reaches Hermes.
 */
declare const process: Readonly<{ env: Readonly<{ EXPO_PUBLIC_CONTENT_SOURCE?: string }> }>;

/** The source a build was given, or the corpus when it was given none; any other word is refused, and named. */
export const sourceOf = (chosen: string | undefined): ContentSource => {
  const source = CONTENT_SOURCES.find((each) => each === (chosen ?? 'mock'));
  if (source === undefined) {
    throw new RangeError(`EXPO_PUBLIC_CONTENT_SOURCE : « ${chosen ?? ''} » n’est ni ${CONTENT_SOURCES.join(' ni ')}`);
  }
  return source;
};

/** The source this build reads. */
export const CONTENT_SOURCE: ContentSource = sourceOf(process.env.EXPO_PUBLIC_CONTENT_SOURCE);
