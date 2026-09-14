/** How code reaches a JavaScript API: a property, of one object or of any, a global, or a regular expression flag. */
export type HermesGap =
  | Readonly<{ kind: 'property'; object: string | null; property: string }>
  | Readonly<{ kind: 'global'; name: string }>
  | Readonly<{ kind: 'regex-flag'; flag: string }>;

/**
 * The JavaScript APIs Hermes V1 lacks, measured in the app itself on hermes-v250829098.0.17 with React Native 0.86.3:
 * 19 absent among 67 probes (journal 0a, verification 15). TypeScript declares them all, so only lint can refuse them.
 */
export const HERMES_GAPS = {
  'array-to-sorted': { kind: 'property', object: null, property: 'toSorted' },
  'array-from-async': { kind: 'property', object: 'Array', property: 'fromAsync' },
  'object-group-by': { kind: 'property', object: 'Object', property: 'groupBy' },
  'map-group-by': { kind: 'property', object: 'Map', property: 'groupBy' },
  'regexp-v-flag': { kind: 'regex-flag', flag: 'v' },
  'regexp-escape': { kind: 'property', object: 'RegExp', property: 'escape' },
  'finalization-registry': { kind: 'global', name: 'FinalizationRegistry' },
  'iterator-helpers': { kind: 'global', name: 'Iterator' },
  temporal: { kind: 'global', name: 'Temporal' },
  'crypto-get-random-values': { kind: 'property', object: 'crypto', property: 'getRandomValues' },
  'crypto-random-uuid': { kind: 'property', object: 'crypto', property: 'randomUUID' },
  'intl-format-range': { kind: 'property', object: null, property: 'formatRange' },
  'intl-relative-time-format': { kind: 'property', object: 'Intl', property: 'RelativeTimeFormat' },
  'intl-plural-rules': { kind: 'property', object: 'Intl', property: 'PluralRules' },
  'intl-list-format': { kind: 'property', object: 'Intl', property: 'ListFormat' },
  'intl-display-names': { kind: 'property', object: 'Intl', property: 'DisplayNames' },
  'intl-locale': { kind: 'property', object: 'Intl', property: 'Locale' },
  'intl-segmenter': { kind: 'property', object: 'Intl', property: 'Segmenter' },
  'intl-supported-values-of': { kind: 'property', object: 'Intl', property: 'supportedValuesOf' },
} as const satisfies Readonly<Record<string, HermesGap>>;

export type HermesGapName = keyof typeof HERMES_GAPS;

export const HERMES_GAP_NAMES = Object.keys(HERMES_GAPS).filter((name): name is HermesGapName =>
  Object.hasOwn(HERMES_GAPS, name),
);

/** How a gap reads in code: `Intl.PluralRules`, `.toSorted`, `FinalizationRegistry`, the `v` flag. */
export function describeGap(gap: HermesGap): string {
  switch (gap.kind) {
    case 'property':
      return gap.object === null ? `.${gap.property}` : `${gap.object}.${gap.property}`;
    case 'global':
      return gap.name;
    case 'regex-flag':
      return `le drapeau ${gap.flag} des expressions régulières`;
  }
}
