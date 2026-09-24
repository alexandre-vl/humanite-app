/**
 * How the imports of the app resolve, as Metro and TypeScript resolve them: `react-native` first, which Expo's
 * `customConditions` also sets, then the usual conditions. Every tool that follows imports takes these.
 */
export const RESOLUTION = {
  conditionNames: ['react-native', 'types', 'import', 'require', 'default'],
  extensions: ['.ts', '.tsx', '.d.ts', '.js', '.json'],
} as const;

/**
 * The middle extension of a module's service variant, and the name of the source it is written for. A build that reads
 * the journal's service resolves `source.service.ts` wherever `source.ts` is imported and both exist, the way Metro
 * resolves `surface.ios.tsx` for `surface.tsx` on iOS: a module whose corpus form would carry the simulated paper into
 * the bundle has a twin that carries none. TypeScript and the tests see the module itself, which reads the corpus.
 */
export const SERVICE_VARIANT = 'service';

/**
 * The variable a build names the source it reads by. Metro reads it to resolve the service variants, and the tests
 * and the emulator's Metro set it to the corpus, whatever the shell exported. The app reads it too, spelled out in
 * full: the one form of a public variable Expo writes into a bundle (`apps/mobile/src/shared/config/source.ts`).
 */
export const SOURCE_VARIABLE = 'EXPO_PUBLIC_CONTENT_SOURCE';

/** The name of the source that reads the simulated paper: what a build naming none reads, and every test does. */
export const CORPUS_SOURCE = 'mock';

/** An extension as a service build tries it first: `.ts` becomes `.service.ts`, and Metro's dotless `ts` `service.ts`. */
const serviceVariantOf = (extension: string): string =>
  extension.startsWith('.') ? `.${SERVICE_VARIANT}${extension}` : `${SERVICE_VARIANT}.${extension}`;

/** Extensions in the order a service build tries them: every one's service variant, then the extensions themselves. */
export const withServiceVariants = (extensions: readonly string[]): string[] => [
  ...extensions.map(serviceVariantOf),
  ...extensions,
];
