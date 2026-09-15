import type { FileTree, Fixture } from '@huma/fixtures';
import { fixtureFactory, IN_PROCESS } from '@huma/fixtures';
import type { PolicyId } from '@huma/eslint-config/policies';
import { lintTree } from '../lint-tree.ts';
import { ALL_POLICIES, mutantsOf } from '../mutation.ts';
import { appTree } from './app-tree.ts';

const define = fixtureFactory<PolicyId>(IN_PROCESS);

/** A model file of the home page, whose source reaches an API. */
const probe = (source: string): FileTree => ({ 'src/pages/home/model/probe.ts': source });

/** The fixtures of the JavaScript APIs Hermes lacks, linted with the policies of `enabled` only. */
const hermesFixtures = (enabled: ReadonlySet<PolicyId>) => {
  const linted = (source: string) => async (): Promise<readonly PolicyId[]> =>
    lintTree(await appTree(probe(source)), enabled);
  return [
    define(
      'guardrail/hermes-array-to-sorted',
      'un tri par toSorted',
      ['hermes/array-to-sorted'],
      linted("export const sorted = ['b', 'a'].toSorted((left, right) => left.localeCompare(right));\n"),
    ),
    define(
      'guardrail/hermes-array-from-async',
      'un tableau lu par Array.fromAsync',
      ['hermes/array-from-async'],
      linted('export const collect = async (): Promise<readonly number[]> => Array.fromAsync([1, 2]);\n'),
    ),
    define(
      'guardrail/hermes-object-group-by',
      'un regroupement par Object.groupBy',
      ['hermes/object-group-by'],
      linted("export const groups = Object.groupBy([1, 2], (value) => (value > 1 ? 'big' : 'small'));\n"),
    ),
    define(
      'guardrail/hermes-map-group-by',
      'un regroupement par Map.groupBy',
      ['hermes/map-group-by'],
      linted('export const groups = Map.groupBy([1, 2], (value) => value > 1);\n'),
    ),
    define(
      'guardrail/hermes-regexp-v-flag',
      'une expression régulière littérale au drapeau v',
      ['hermes/regexp-v-flag'],
      linted('export const letters = /[a-z]/v;\n'),
    ),
    define(
      'guardrail/hermes-regexp-v-flag-constructor',
      'une expression régulière construite avec le drapeau v',
      ['hermes/regexp-v-flag'],
      linted("export const letters = new RegExp('[a-z]', 'v');\n"),
    ),
    define(
      'guardrail/hermes-regexp-v-flag-call',
      'une expression régulière appelée avec le drapeau v',
      ['hermes/regexp-v-flag'],
      linted("export const letters = RegExp('[a-z]', 'gv');\n"),
    ),
    define(
      'guardrail/hermes-regexp-escape',
      'un échappement par RegExp.escape',
      ['hermes/regexp-escape'],
      linted("export const escaped = RegExp.escape('a.b');\n"),
    ),
    define(
      'guardrail/hermes-finalization-registry',
      'un registre de finalisation',
      ['hermes/finalization-registry'],
      linted('export const registry = new FinalizationRegistry((held: string) => held.length);\n'),
    ),
    define(
      'guardrail/hermes-iterator-helpers',
      'un itérateur construit par Iterator.from',
      ['hermes/iterator-helpers'],
      linted('export const values = Iterator.from([1, 2]);\n'),
    ),
    define(
      'guardrail/hermes-temporal',
      'une lecture de Temporal',
      ['hermes/temporal'],
      linted('export const temporal = typeof Temporal;\n'),
    ),
    define(
      'guardrail/hermes-temporal-global-this',
      'une lecture de Temporal à travers globalThis',
      ['hermes/temporal'],
      linted('export const temporal = typeof globalThis.Temporal;\n'),
    ),
    define(
      'guardrail/hermes-crypto-get-random-values',
      'un tirage par crypto.getRandomValues',
      ['hermes/crypto-get-random-values'],
      linted(
        'declare const crypto: { getRandomValues: (values: Uint8Array) => Uint8Array };\n\nexport const random = crypto.getRandomValues(new Uint8Array(4));\n',
      ),
    ),
    define(
      'guardrail/hermes-crypto-random-uuid',
      'un identifiant tiré par crypto.randomUUID',
      ['hermes/crypto-random-uuid'],
      linted('declare const crypto: { randomUUID: () => string };\n\nexport const id = crypto.randomUUID();\n'),
    ),
    define(
      'guardrail/hermes-intl-format-range',
      'un intervalle de dates formaté par formatRange',
      ['hermes/intl-format-range'],
      linted("export const range = new Intl.DateTimeFormat('fr').formatRange(new Date(0), new Date(1));\n"),
    ),
    define(
      'guardrail/hermes-intl-relative-time-format',
      'une durée relative formatée par Intl.RelativeTimeFormat',
      ['hermes/intl-relative-time-format'],
      linted("export const relative = new Intl.RelativeTimeFormat('fr').format(-5, 'minute');\n"),
    ),
    define(
      'guardrail/hermes-intl-plural-rules',
      'un pluriel choisi par Intl.PluralRules',
      ['hermes/intl-plural-rules'],
      linted("export const plural = new Intl.PluralRules('fr').select(2);\n"),
    ),
    define(
      'guardrail/hermes-intl-plural-rules-global-this',
      'Intl.PluralRules atteint à travers globalThis',
      ['hermes/intl-plural-rules'],
      linted("export const plural = new globalThis.Intl.PluralRules('fr').select(2);\n"),
    ),
    define(
      'guardrail/hermes-intl-plural-rules-destructured',
      'Intl.PluralRules tiré d’Intl par déstructuration',
      ['hermes/intl-plural-rules'],
      linted('export const { PluralRules } = Intl;\n'),
    ),
    define(
      'guardrail/hermes-intl-list-format',
      'une énumération formatée par Intl.ListFormat',
      ['hermes/intl-list-format'],
      linted("export const list = new Intl.ListFormat('fr').format(['a', 'b']);\n"),
    ),
    define(
      'guardrail/hermes-intl-display-names',
      'un nom de région lu par Intl.DisplayNames',
      ['hermes/intl-display-names'],
      linted("export const region = new Intl.DisplayNames(['fr'], { type: 'region' }).of('FR');\n"),
    ),
    define(
      'guardrail/hermes-intl-locale',
      'une langue lue par Intl.Locale',
      ['hermes/intl-locale'],
      linted("export const language = new Intl.Locale('fr').language;\n"),
    ),
    define(
      'guardrail/hermes-intl-segmenter',
      'un texte découpé par Intl.Segmenter',
      ['hermes/intl-segmenter'],
      linted("export const segments = [...new Intl.Segmenter('fr').segment('mot')];\n"),
    ),
    define(
      'guardrail/hermes-intl-supported-values-of',
      'les devises lues par Intl.supportedValuesOf',
      ['hermes/intl-supported-values-of'],
      linted("export const currencies = Intl.supportedValuesOf('currency');\n"),
    ),
  ] as const;
};

export const HERMES_FIXTURES = hermesFixtures(ALL_POLICIES);

export const hermesMutants = (policy: PolicyId): readonly Fixture<string, PolicyId>[] =>
  mutantsOf(hermesFixtures, policy);
