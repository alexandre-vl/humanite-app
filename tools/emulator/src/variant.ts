/**
 * What Gradle is asked to assemble, and the ABI it assembles for.
 *
 * The two were written into the argv as constants for as long as the only thing built was the dev client that runs in
 * the container. A performance budget cannot be read on that build — ADR-0025 refuses a debuggable package, and one
 * served by Metro is not the program a reader installs — so the chain has to be able to name the other one.
 *
 * They are two axes and not one. A variant says what Gradle runs and where it writes; an ABI says which machine the
 * result runs on, and the phone the budgets are measured on is `arm64-v8a` where the container is `x86_64`. Naming
 * them together would tie a release to a phone and a debug build to a container, which is true today and is not a
 * rule.
 */

/** What Gradle assembles, and everything that follows from the choice. */
type BuildVariant = Readonly<{
  /** The Gradle task. */
  task: string;
  /**
   * Properties the Android template reads and that nothing else can hold: `android/` is generated at every build and
   * fails the build if prebuild rewrote a tracked file, so a value written there would not survive one run.
   */
  properties: readonly string[];
  /** The directory and the file the task writes, under `app/build/outputs/apk`. */
  output: readonly [string, string];
}>;

/**
 * `enableMinifyInReleaseBuilds` and its sibling default to false in the template and are defined nowhere in the tree:
 * without them `assembleRelease` would produce a package neither shrunk nor optimised, which is not what a reader
 * installs either. Release is signed with the debug key — the template's own caution — and that is not what makes a
 * package debuggable: the flag comes from the build type, which is why the measurement tool accepts this one.
 */
export const VARIANTS = {
  debug: { task: 'assembleDebug', properties: [], output: ['debug', 'app-debug.apk'] },
  release: {
    task: 'assembleRelease',
    properties: ['-Pandroid.enableMinifyInReleaseBuilds=true', '-Pandroid.enableShrinkResourcesInReleaseBuilds=true'],
    output: ['release', 'app-release.apk'],
  },
} as const satisfies Readonly<Record<string, BuildVariant>>;

/** The name of a variant. */
export type VariantName = keyof typeof VARIANTS;

/** The variants, read off the table rather than listed again beside it. */
export const VARIANT_NAMES: readonly VariantName[] = Object.keys(VARIANTS).filter((name): name is VariantName =>
  Object.hasOwn(VARIANTS, name),
);

export const isVariantName = (value: string): value is VariantName => VARIANT_NAMES.some((name) => name === value);

/** The machines this project builds for: the container's architecture, and the phone's. */
export const ABIS = ['x86_64', 'arm64-v8a'] as const;

/** The name of an ABI. */
export type Abi = (typeof ABIS)[number];

export const isAbi = (value: string): value is Abi => ABIS.some((abi) => abi === value);

/** What one build is: what to assemble, and for which machine. */
export type Build = Readonly<{ variant: VariantName; abi: Abi }>;
