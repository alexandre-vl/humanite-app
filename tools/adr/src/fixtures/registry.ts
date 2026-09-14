import type { FileTree, Fixture } from '@huma/fixtures';
import type { CheckCode } from '../diagnostics.ts';
import { countWords, parseMarkdown } from '../markdown.ts';
import type { Bindings } from '../model.ts';
import { adrNumber } from '../model.ts';
import { LIMITS } from '../spec.ts';
import { adrDocument, BASE_TITLE, pathFor, replaceOnce } from './documents.ts';
import type { FixtureRepository } from './repository.ts';
import { checkFixture, FAKE_PROOFS } from './repository.ts';

type AdrFixture<Id extends string, Expected extends readonly CheckCode[]> = Fixture<Id, CheckCode> &
  Readonly<{ expected: Expected }>;

const define = <const Id extends string, const Expected extends readonly CheckCode[]>(
  id: Id,
  description: string,
  expected: Expected,
  repository: FixtureRepository,
): AdrFixture<Id, Expected> => ({ id, description, expected, run: async () => checkFixture(repository) });

const ZERO = pathFor(adrNumber(0));
const ONE = pathFor(adrNumber(1), 'Validation des données par Valibot');

const proposed = adrDocument();
const accepted = adrDocument({ status: 'accepted' });
const only = (document: string): FileTree => ({ [ZERO]: document });
const acceptedBindings: Bindings = { 'ADR-0000': { scope: ['docs/adr/**'], rules: { R1: [FAKE_PROOFS.passing] } } };

/** Replaces the question of the context with a bullet that holds `count` extra words. */
function withWords(count: number): string {
  const filler = Array.from({ length: count }, () => 'mot').join(' ');
  return replaceOnce(proposed, '- `pnpm view zod version`', `- Mesure ${filler} \`wc\`.\n- \`pnpm view zod version\``);
}

const wordsToLimit = LIMITS.words - countWords(parseMarkdown(withWords(0)));

const withStatusExample = replaceOnce(
  proposed,
  '\nQuelle bibliothèque',
  '\n```yaml\nstatus: accepted\n```\n\nQuelle bibliothèque',
);

export const ADR_FIXTURES = [
  define('adr/valid', 'un ADR proposé, commité, avec son index', [], { commits: [only(proposed)] }),
  define('adr/valid-accepted', 'proposé puis accepté, avec une preuve liée', [], {
    commits: [only(proposed), only(accepted)],
    bindings: acceptedBindings,
  }),
  define('adr/valid-superseded', 'un ADR accepté remplacé par un ADR accepté plus récent', [], {
    commits: [
      only(proposed),
      only(accepted),
      { [ZERO]: accepted, [ONE]: adrDocument({ title: 'Validation des données par Valibot', supersedes: 'ADR-0000' }) },
      {
        [ZERO]: accepted,
        [ONE]: adrDocument({ title: 'Validation des données par Valibot', status: 'accepted', supersedes: 'ADR-0000' }),
      },
    ],
    bindings: { 'ADR-0001': { scope: ['docs/adr/**'], rules: { R1: [FAKE_PROOFS.passing] } } },
  }),
  define('adr/valid-words-limit', `exactement ${String(LIMITS.words)} mots`, [], {
    worktree: only(withWords(wordsToLimit)),
  }),
  define(
    'adr/valid-code-block-status',
    'un ADR proposé qui cite « status: accepted » dans un bloc de code, puis modifié',
    [],
    {
      commits: [
        only(withStatusExample),
        only(replaceOnce(withStatusExample, 'alourdit le paquet', 'grossit le paquet')),
      ],
    },
  ),
  define('adr/valid-staged-acceptance', 'acceptation dans l’index avec une preuve qui passe', [], {
    commits: [only(proposed)],
    staged: only(accepted),
    bindings: acceptedBindings,
    source: 'index',
  }),

  define('adr/path', 'un fichier au nom invalide dans docs/adr', ['adr/path'], {
    worktree: { ...only(proposed), 'docs/adr/12-Mauvais_Nom.md': proposed },
  }),
  define('adr/encoding', 'un titre en NFD', ['adr/encoding'], {
    worktree: only(replaceOnce(proposed, '# Validation des données', '# Validation des données'.normalize('NFD'))),
  }),
  define('adr/frontmatter-yaml', 'une clé YAML en double', ['adr/frontmatter-yaml'], {
    worktree: only(replaceOnce(proposed, 'status: proposed\n', 'status: proposed\nstatus: proposed\n')),
  }),
  define('adr/frontmatter-schema', 'un statut hors du format', ['adr/frontmatter-schema'], {
    worktree: only(replaceOnce(proposed, 'status: proposed', 'status: approved')),
  }),
  define('adr/frontmatter-canonical', 'un statut entre apostrophes', ['adr/frontmatter-canonical'], {
    worktree: only(replaceOnce(proposed, 'status: proposed', "status: 'proposed'")),
  }),
  define('adr/markdown-subset', 'du texte barré', ['adr/markdown-subset'], {
    worktree: only(replaceOnce(proposed, 'La bibliothèque documente', 'La bibliothèque ~~ancienne~~ documente')),
  }),
  define('adr/title', 'un titre « sujet : liste »', ['adr/title'], {
    worktree: {
      [pathFor(adrNumber(0), 'Validation : données par Zod')]: replaceOnce(
        proposed,
        `# ${BASE_TITLE}`,
        '# Validation : données par Zod',
      ),
    },
  }),
  define('adr/slug', 'un nom de fichier qui ne suit pas le titre', ['adr/slug'], {
    worktree: { 'docs/adr/0000-zod.md': proposed },
  }),
  define('adr/sections', 'options avant critères', ['adr/sections'], {
    worktree: only(
      replaceOnce(
        proposed,
        '## Critères de décision\n\n- **C1** — Messages d’erreur en français.\n- **C2** — Types TypeScript inférés depuis le schéma.\n\n## Options étudiées\n\n- Zod\n- Valibot\n',
        '## Options étudiées\n\n- Zod\n- Valibot\n\n## Critères de décision\n\n- **C1** — Messages d’erreur en français.\n- **C2** — Types TypeScript inférés depuis le schéma.\n',
      ),
    ),
  }),
  define('adr/context', 'un contexte sans question', ['adr/context'], {
    worktree: only(replaceOnce(proposed, '\nQuelle bibliothèque valide les données reçues par l’application ?\n', '')),
  }),
  define('adr/criteria', 'un critère C3 après C1', ['adr/criteria'], {
    worktree: only(replaceOnce(proposed, '- **C2** — Types', '- **C3** — Types')),
  }),
  define('adr/options', 'une sous-section d’option renommée', ['adr/options'], {
    worktree: only(replaceOnce(proposed, '### Valibot', '### Valibot 1')),
  }),
  define('adr/decision', 'une option retenue absente des options', ['adr/decision'], {
    worktree: only(replaceOnce(proposed, '« Zod »', '« Joi »')),
  }),
  define('adr/keywords', 'un DEVRAIT dans une conséquence', ['adr/keywords'], {
    worktree: only(replaceOnce(proposed, 'les types découlent du schéma', 'les types DEVRAIT découler du schéma')),
  }),
  define('adr/valence', 'une conséquence sans valence', ['adr/valence'], {
    worktree: only(
      replaceOnce(proposed, '- Mauvais, parce que la bibliothèque alourdit', '- Coût : la bibliothèque alourdit'),
    ),
  }),
  define('adr/criteria-cited', 'un critère C4 cité alors qu’il y en a deux', ['adr/criteria-cited'], {
    worktree: only(replaceOnce(proposed, 'aussi inférés (C2)', 'aussi inférés (C4)')),
  }),
  define('adr/reevaluation', 'aucun déclencheur de réévaluation', ['adr/reevaluation'], {
    worktree: only(
      replaceOnce(
        proposed,
        '- Réévaluation : Zod cesse de publier sa locale française.',
        '- Documentation : [zod.dev](https://zod.dev).',
      ),
    ),
  }),
  define('adr/words', `${String(LIMITS.words + 1)} mots`, ['adr/words'], {
    worktree: only(withWords(wordsToLimit + 1)),
  }),
  define('adr/link-target', 'un lien relatif vers un fichier absent', ['adr/link-target'], {
    worktree: only(
      replaceOnce(
        proposed,
        'sur [zod.dev](https://zod.dev).',
        'sur [zod.dev](https://zod.dev) et [le journal](../spikes/absent.md).',
      ),
    ),
  }),
  define('adr/number-unique', 'deux fichiers pour ADR-0000', ['adr/number-unique'], {
    worktree: {
      ...only(proposed),
      [pathFor(adrNumber(0), 'Validation des données par Valibot')]: adrDocument({
        title: 'Validation des données par Valibot',
      }),
    },
  }),
  define('adr/references', 'un remplacement d’ADR inexistant', ['adr/references'], {
    worktree: {
      [ONE]: adrDocument({ title: 'Validation des données par Valibot', supersedes: 'ADR-0009' }),
      [ZERO]: proposed,
    },
  }),
  define('adr/index', 'un index périmé', ['adr/index'], {
    worktree: { ...only(proposed), 'docs/adr/README.md': '# Index périmé\n' },
  }),
  define('adr/bindings', 'un ADR accepté sans liens vers ses preuves', ['adr/bindings'], {
    commits: [only(proposed), only(accepted)],
  }),
  define('adr/scope', 'un périmètre qui ne couvre aucun fichier', ['adr/scope'], {
    commits: [only(proposed), only(accepted)],
    bindings: { 'ADR-0000': { scope: ['packages/inexistant/**'], rules: { R1: [FAKE_PROOFS.passing] } } },
  }),
  define('adr/history', 'un clone superficiel', ['adr/history'], {
    commits: [only(proposed), only(replaceOnce(proposed, 'alourdit le paquet', 'grossit le paquet'))],
    shallow: true,
  }),
  define('adr/transitions', 'un ADR commité directement en accepted', ['adr/transitions'], {
    commits: [only(accepted)],
    bindings: acceptedBindings,
  }),
  define('adr/frozen', 'un ADR accepté puis modifié', ['adr/frozen'], {
    commits: [only(proposed), only(accepted)],
    worktree: only(replaceOnce(accepted, 'alourdit le paquet', 'grossit le paquet')),
    bindings: acceptedBindings,
  }),
  define('adr/frozen-renamed', 'un ADR accepté puis renommé', ['adr/frozen'], {
    commits: [
      only(proposed),
      only(accepted),
      {
        [pathFor(adrNumber(0), 'Validation par Zod')]: replaceOnce(accepted, `# ${BASE_TITLE}`, '# Validation par Zod'),
      },
    ],
    bindings: acceptedBindings,
  }),
  define('adr/no-deletion', 'un ADR commité puis supprimé', ['adr/no-deletion'], {
    commits: [{ [ZERO]: proposed, [ONE]: adrDocument({ title: 'Validation des données par Valibot' }) }],
    worktree: only(proposed),
  }),
  define('adr/accept-proofs', 'acceptation dans l’index avec une preuve en échec', ['adr/accept-proofs'], {
    commits: [only(proposed)],
    staged: only(accepted),
    bindings: { 'ADR-0000': { scope: ['docs/adr/**'], rules: { R1: [FAKE_PROOFS.failing] } } },
    source: 'index',
  }),
] as const;

export type AdrProofId = (typeof ADR_FIXTURES)[number]['id'];
