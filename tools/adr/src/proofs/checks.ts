import { fixtureFactory } from '@huma/fixtures';
import { git, resolveCommit } from '@huma/kit/git';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { countWords, parseMarkdown } from '../analysis/markdown.ts';
import type { Bindings } from '../model/bindings.ts';
import type { CheckCode } from '../spec/checks.ts';
import { FORMAT_1 } from '../spec/formats/v1.ts';
import {
  ACCEPTED,
  adrDocument,
  BASE_TITLE,
  mutated,
  ONE,
  OTHER_TITLE,
  pathFor,
  PROPOSED,
  replaceOnce,
  ZERO,
} from './documents.ts';
import { checkFiles, checkHistoryFixture, checkPlainDirectory, FAKE_PROOFS } from './runners.ts';

const define = fixtureFactory<CheckCode>();

const inMemory =
  (files: Readonly<Record<string, string | Uint8Array>>, options: Parameters<typeof checkFiles>[1] = {}) =>
  async (): Promise<readonly CheckCode[]> =>
    Promise.resolve(checkFiles(files, options));

const only = (document: string): Readonly<Record<string, string>> => ({ [ZERO]: document });

const provenBinding = { scope: { paths: ['docs/adr/**'] }, rules: { R1: [FAKE_PROOFS.passing] } } as const;

const proven: Bindings = { 'ADR-0000': provenBinding };

const VALIBOT_ARGUMENTS =
  '### Valibot\n\n- Mauvais, parce qu’aucune locale française n’est fournie (C1).\n- Neutre, parce que les types sont aussi inférés (C2).\n\n';

/** The base document with the question replaced by a fact holding `count` extra words. */
function withWords(count: number): string {
  const filler = Array.from({ length: count }, () => 'mot').join(' ');
  return replaceOnce(PROPOSED, '- `pnpm view zod version`', `- Mesure ${filler} \`wc\`.\n- \`pnpm view zod version\``);
}

const wordsToLimit = FORMAT_1.limits.words - countWords(parseMarkdown(withWords(0)));

const withStatusExample = replaceOnce(
  PROPOSED,
  '\nQuelle bibliothèque',
  '\n```yaml\nstatus: accepted\n```\n\nQuelle bibliothèque',
);

const encoder = new TextEncoder();

const withInvalidByte = (): Uint8Array => {
  const bytes = encoder.encode(PROPOSED);
  const index = bytes.indexOf(0x0a) + 1;
  return Uint8Array.from([...bytes.subarray(0, index), 0xc3, 0x28, ...bytes.subarray(index)]);
};

/** A second format that only raises the version: a proposed ADR in format 1 is then outdated. */
const twoFormats = { formats: [FORMAT_1, { ...FORMAT_1, version: 2 }], latest: { ...FORMAT_1, version: 2 } };

const longTitle = 'Validation des données reçues par le service de publication des articles';

export const CHECK_FIXTURES = [
  define('adr/valid', 'un ADR proposé complet', [], inMemory(only(PROPOSED))),
  define('adr/valid-words-limit', 'exactement le nombre de mots permis', [], inMemory(only(withWords(wordsToLimit)))),
  define(
    'adr/valid-nbsp',
    'espaces insécables autour des guillemets de l’option retenue',
    [],
    inMemory(mutated('Option retenue : « Zod », parce que', 'Option retenue\u{A0}: «\u{202F}Zod\u{202F}», parce que')),
  ),

  define(
    'adr/encoding-invalid-utf8',
    'un octet qui n’est pas de l’UTF-8',
    ['adr/encoding-invalid-utf8'],
    inMemory({ [ZERO]: withInvalidByte() }),
  ),
  define(
    'adr/encoding-bom',
    'une marque d’ordre des octets',
    ['adr/encoding-bom'],
    inMemory(only(`\u{FEFF}${PROPOSED}`)),
  ),
  define(
    'adr/encoding-not-nfc',
    'un titre décomposé en NFD',
    ['adr/encoding-not-nfc'],
    inMemory(mutated(`# ${BASE_TITLE}`, `# ${BASE_TITLE.normalize('NFD')}`)),
  ),
  define(
    'adr/encoding-invisible',
    'une espace de largeur nulle dans un fait',
    ['adr/encoding-invisible'],
    inMemory(mutated('documente sa locale', 'documente\u{200B} sa locale')),
  ),
  define(
    'adr/encoding-invisible-crlf',
    'des fins de ligne CRLF',
    ['adr/encoding-invisible'],
    inMemory(only(PROPOSED.replaceAll('\n', '\r\n'))),
  ),

  define(
    'adr/frontmatter-missing',
    'aucun en-tête',
    ['adr/frontmatter-missing'],
    inMemory(only(PROPOSED.slice(PROPOSED.indexOf('# ')))),
  ),
  define(
    'adr/frontmatter-yaml',
    'une clé en double',
    ['adr/frontmatter-yaml'],
    inMemory(mutated('status: proposed\n', 'status: proposed\nstatus: proposed\n')),
  ),
  define(
    'adr/frontmatter-format-unknown',
    'un format inconnu',
    ['adr/frontmatter-format-unknown'],
    inMemory(mutated('format: 1', 'format: 9')),
  ),
  define(
    'adr/frontmatter-format-outdated',
    'un ADR proposé dans un format dépassé',
    ['adr/frontmatter-format-outdated'],
    inMemory(only(PROPOSED), { formats: twoFormats }),
  ),
  define(
    'adr/frontmatter-schema',
    'un statut hors du processus',
    ['adr/frontmatter-schema'],
    inMemory(mutated('status: proposed', 'status: approved')),
  ),
  define(
    'adr/frontmatter-not-canonical',
    'un statut entre apostrophes',
    ['adr/frontmatter-not-canonical'],
    inMemory(mutated('status: proposed', "status: 'proposed'")),
  ),

  define(
    'adr/markdown-node',
    'du texte barré',
    ['adr/markdown-node'],
    inMemory(mutated('La bibliothèque documente', 'La bibliothèque ~~ancienne~~ documente')),
  ),
  define(
    'adr/markdown-heading-depth',
    'un titre de niveau 4 après les règles',
    ['adr/markdown-heading-depth', 'adr/decision-trailing-block'],
    inMemory(mutated('\n### Conséquences', '\n#### Détail\n\n### Conséquences')),
  ),
  define(
    'adr/markdown-task-list',
    'une case à cocher dans les options',
    ['adr/markdown-task-list'],
    inMemory(mutated('- Valibot\n', '- [ ] Valibot\n')),
  ),
  define(
    'adr/markdown-link-title',
    'un lien avec un titre',
    ['adr/markdown-link-title'],
    inMemory(mutated('(https://zod.dev)', '(https://zod.dev "Zod")')),
  ),
  define(
    'adr/markdown-indented-code',
    'un bloc de code indenté',
    ['adr/markdown-indented-code'],
    inMemory(mutated('## Contexte et problème\n', '## Contexte et problème\n\n    pnpm view zod\n')),
  ),
  define(
    'adr/markdown-code-language',
    'un bloc de code sans langage',
    ['adr/markdown-code-language'],
    inMemory(mutated('## Contexte et problème\n', '## Contexte et problème\n\n```\npnpm view zod\n```\n')),
  ),

  define('adr/title-missing', 'aucun titre', ['adr/title-missing'], inMemory(mutated(`# ${BASE_TITLE}\n\n`, ''))),
  define(
    'adr/title-not-first',
    'un paragraphe avant le titre',
    ['adr/title-not-first'],
    inMemory(mutated(`# ${BASE_TITLE}`, `Préambule.\n\n# ${BASE_TITLE}`)),
  ),
  define(
    'adr/title-duplicate',
    'un second titre à la fin',
    ['adr/title-duplicate'],
    inMemory(only(`${PROPOSED}\n# Autre titre\n`)),
  ),
  define(
    'adr/title-rich',
    'un titre en emphase',
    ['adr/title-rich'],
    inMemory(mutated(`# ${BASE_TITLE}`, '# Validation des données par *Zod*')),
  ),
  define(
    'adr/title-no-letter',
    'un titre sans lettre',
    ['adr/title-no-letter'],
    inMemory({ 'docs/adr/0000-signes.md': replaceOnce(PROPOSED, `# ${BASE_TITLE}`, '# « »') }),
  ),
  define(
    'adr/title-too-long',
    'un titre trop long',
    ['adr/title-too-long'],
    inMemory({ [pathFor(0, longTitle)]: replaceOnce(PROPOSED, `# ${BASE_TITLE}`, `# ${longTitle}`) }),
  ),
  define(
    'adr/title-forbidden-character',
    'un titre avec deux-points collés',
    ['adr/title-forbidden-character'],
    inMemory({
      [pathFor(0, 'Validation: données par Zod')]: replaceOnce(
        PROPOSED,
        `# ${BASE_TITLE}`,
        '# Validation: données par Zod',
      ),
    }),
  ),
  define(
    'adr/title-final-punctuation',
    'un titre terminé par un point',
    ['adr/title-final-punctuation'],
    inMemory(mutated(`# ${BASE_TITLE}`, `# ${BASE_TITLE}.`)),
  ),
  define(
    'adr/slug-mismatch',
    'un nom de fichier qui ne suit pas le titre',
    ['adr/slug-mismatch'],
    inMemory({ 'docs/adr/0000-zod.md': PROPOSED }),
  ),

  define(
    'adr/section-content-before',
    'un paragraphe entre titre et sections',
    ['adr/section-content-before'],
    inMemory(mutated('\n## Contexte et problème', '\nIntroduction.\n\n## Contexte et problème')),
  ),
  define(
    'adr/section-order',
    'options avant critères',
    ['adr/section-order'],
    inMemory(
      mutated(
        '## Critères de décision\n\n- **C1** — Messages d’erreur en français.\n- **C2** — Types TypeScript inférés depuis le schéma.\n\n## Options étudiées\n\n- Zod\n- Valibot\n',
        '## Options étudiées\n\n- Zod\n- Valibot\n\n## Critères de décision\n\n- **C1** — Messages d’erreur en français.\n- **C2** — Types TypeScript inférés depuis le schéma.\n',
      ),
    ),
  ),
  define(
    'adr/section-subsection',
    'une sous-section dans le contexte',
    ['adr/section-subsection'],
    inMemory(mutated('l’application ?\n', 'l’application ?\n\n### Détail\n')),
  ),
  define(
    'adr/section-consequences',
    'une sous-section Effets',
    ['adr/section-consequences'],
    inMemory(mutated('### Conséquences', '### Effets')),
  ),
  define(
    'adr/section-pros-and-cons-text',
    'un paragraphe hors des options',
    ['adr/section-pros-and-cons-text'],
    inMemory(
      mutated('## Avantages et inconvénients des options\n', '## Avantages et inconvénients des options\n\nRésumé.\n'),
    ),
  ),

  define(
    'adr/context-question-missing',
    'aucune question',
    ['adr/context-question-missing'],
    inMemory(mutated('\nQuelle bibliothèque valide les données reçues par l’application ?\n', '')),
  ),
  define(
    'adr/context-question-shape',
    'une question sans point d’interrogation',
    ['adr/context-question-shape'],
    inMemory(mutated('par l’application ?', 'par l’application.')),
  ),
  define(
    'adr/context-facts-missing',
    'des faits en code seulement',
    ['adr/context-facts-missing'],
    inMemory(
      mutated(
        '- La bibliothèque documente sa locale française sur [zod.dev](https://zod.dev).\n- `pnpm view zod version` affiche la version publiée.\n',
        '```bash\npnpm view zod version\n```\n',
      ),
    ),
  ),
  define(
    'adr/context-fact-shape',
    'un fait sur deux paragraphes',
    ['adr/context-fact-shape'],
    inMemory(
      mutated(
        '- `pnpm view zod version` affiche la version publiée.\n',
        '- `pnpm view zod version` affiche la version publiée.\n\n  Suite du fait.\n',
      ),
    ),
  ),
  define(
    'adr/context-fact-unsourced',
    'un fait sans source',
    ['adr/context-fact-unsourced'],
    inMemory(mutated('sur [zod.dev](https://zod.dev).', 'dans sa documentation.')),
  ),
  define(
    'adr/context-stray-block',
    'un paragraphe avant les faits',
    ['adr/context-stray-block'],
    inMemory(mutated('## Contexte et problème\n', '## Contexte et problème\n\nAvant les faits.\n')),
  ),

  define(
    'adr/criteria-list',
    'un paragraphe après les critères',
    ['adr/criteria-list'],
    inMemory(mutated('depuis le schéma.\n', 'depuis le schéma.\n\nFin des critères.\n')),
  ),
  define(
    'adr/criteria-label',
    'un critère C3 après C1',
    ['adr/criteria-label'],
    inMemory(mutated('- **C2** — Types', '- **C3** — Types')),
  ),

  define(
    'adr/options-list',
    'un paragraphe après les options',
    ['adr/options-list'],
    inMemory(mutated('- Valibot\n', '- Valibot\n\nFin des options.\n')),
  ),
  define(
    'adr/options-name',
    'une option entre guillemets',
    ['adr/options-name'],
    inMemory(mutated('- Valibot\n', '- « Valibot »\n')),
  ),
  define(
    'adr/options-duplicate',
    'une option en double',
    ['adr/options-duplicate'],
    inMemory(mutated('- Zod\n- Valibot\n', '- Zod\n- Zod\n')),
  ),
  define(
    'adr/options-too-few',
    'une seule option',
    ['adr/options-too-few'],
    inMemory(only(replaceOnce(replaceOnce(PROPOSED, '- Zod\n- Valibot\n', '- Zod\n'), VALIBOT_ARGUMENTS, ''))),
  ),
  define(
    'adr/options-subsections',
    'une sous-section d’option renommée',
    ['adr/options-subsections'],
    inMemory(mutated('### Valibot', '### Valibot 1')),
  ),

  define(
    'adr/decision-chosen-shape',
    'une option retenue sans guillemets',
    ['adr/decision-chosen-shape'],
    inMemory(mutated('« Zod », parce que sa locale', 'Zod, parce que sa locale')),
  ),
  define(
    'adr/decision-chosen-unknown',
    'une option retenue absente des options',
    ['adr/decision-chosen-unknown'],
    inMemory(mutated('« Zod »', '« Joi »')),
  ),
  define(
    'adr/decision-chosen-duplicate',
    'une seconde option retenue',
    ['adr/decision-chosen-duplicate'],
    inMemory(mutated('- Réévaluation :', '- Option retenue : rappel.\n- Réévaluation :')),
  ),
  define(
    'adr/decision-rules-missing',
    'aucune règle',
    ['adr/decision-rules-missing'],
    inMemory(
      mutated(
        '- **R1** — Une donnée reçue DOIT être validée par un schéma Zod.\n- **R2** — Un schéma PEUT être partagé entre deux paquets.\n\n',
        '',
      ),
    ),
  ),
  define(
    'adr/decision-rule-label',
    'une règle R3 après R1',
    ['adr/decision-rule-label'],
    inMemory(mutated('- **R2** — Un schéma', '- **R3** — Un schéma')),
  ),
  define(
    'adr/decision-trailing-block',
    'un paragraphe après les règles',
    ['adr/decision-trailing-block'],
    inMemory(mutated('entre deux paquets.\n', 'entre deux paquets.\n\nRemarque.\n')),
  ),
  define(
    'adr/decision-no-binding-rule',
    'seulement des règles PEUT',
    ['adr/decision-no-binding-rule'],
    inMemory(mutated('reçue DOIT être', 'reçue PEUT être')),
  ),

  define(
    'adr/keyword-forbidden',
    'un DEVRAIT dans une conséquence',
    ['adr/keyword-forbidden'],
    inMemory(mutated('les types découlent du schéma', 'les types DEVRAIT découler du schéma')),
  ),
  define(
    'adr/keyword-forbidden-unaccented',
    'un RECOMMANDE sans accent',
    ['adr/keyword-forbidden'],
    inMemory(mutated('les types découlent du schéma', 'le schéma est RECOMMANDE')),
  ),
  define(
    'adr/keyword-negation',
    'une négation en minuscules',
    ['adr/keyword-negation'],
    inMemory(mutated('reçue DOIT être', 'reçue ne DOIT pas être')),
  ),
  define(
    'adr/keyword-count',
    'une règle à deux mots-clés',
    ['adr/keyword-count'],
    inMemory(mutated('Un schéma PEUT être partagé', 'Un schéma PEUT être partagé et DOIT')),
  ),
  define(
    'adr/keyword-outside-rule',
    'un DOIT dans une conséquence',
    ['adr/keyword-outside-rule'],
    inMemory(mutated('les types découlent du schéma', 'les types DOIT découler du schéma')),
  ),

  define(
    'adr/argument-list',
    'un paragraphe après les conséquences',
    ['adr/argument-list'],
    inMemory(mutated('alourdit le paquet.\n', 'alourdit le paquet.\n\nBilan.\n')),
  ),
  define(
    'adr/argument-shape',
    'une conséquence sans valence',
    ['adr/argument-shape'],
    inMemory(mutated('- Mauvais, parce que la bibliothèque alourdit', '- Coût : la bibliothèque alourdit')),
  ),
  define(
    'adr/consequences-balance',
    'aucune conséquence mauvaise',
    ['adr/consequences-balance'],
    inMemory(mutated('- Mauvais, parce que la bibliothèque alourdit', '- Neutre, parce que la bibliothèque alourdit')),
  ),
  define(
    'adr/option-chosen-without-good',
    'l’option retenue sans Bien',
    ['adr/option-chosen-without-good'],
    inMemory(
      only(
        replaceOnce(
          replaceOnce(
            PROPOSED,
            '- Bien, parce que la locale française est fournie (C1).',
            '- Neutre, parce que la locale française est fournie (C1).',
          ),
          '- Bien, parce que les types sont inférés (C2).',
          '- Neutre, parce que les types sont inférés (C2).',
        ),
      ),
    ),
  ),
  define(
    'adr/option-rejected-without-bad',
    'une option écartée sans Mauvais',
    ['adr/option-rejected-without-bad'],
    inMemory(mutated('- Mauvais, parce qu’aucune locale', '- Neutre, parce qu’aucune locale')),
  ),

  define(
    'adr/citation-malformed',
    'une citation (C 2)',
    ['adr/citation-malformed'],
    inMemory(mutated('aussi inférés (C2)', 'aussi inférés (C2) (C 2)')),
  ),
  define(
    'adr/citation-unknown',
    'un critère C4 cité',
    ['adr/citation-unknown'],
    inMemory(mutated('aussi inférés (C2)', 'aussi inférés (C2, C4)')),
  ),
  define(
    'adr/citation-chosen-missing',
    'une option retenue sans critère',
    ['adr/citation-chosen-missing'],
    inMemory(mutated('est fournie (C1).\n\n- **R1**', 'est fournie.\n\n- **R1**')),
  ),
  define(
    'adr/citation-argument-missing',
    'un argument sans critère',
    ['adr/citation-argument-missing'],
    inMemory(mutated('aussi inférés (C2)', 'aussi inférés')),
  ),
  define(
    'adr/citation-criterion-unused',
    'un critère jamais cité',
    ['adr/citation-criterion-unused'],
    inMemory(
      only(
        replaceOnce(
          replaceOnce(PROPOSED, 'sont inférés (C2)', 'sont inférés (C1)'),
          'aussi inférés (C2)',
          'aussi inférés (C1)',
        ),
      ),
    ),
  ),

  define(
    'adr/reevaluation-list',
    'un paragraphe après les informations',
    ['adr/reevaluation-list'],
    inMemory(only(`${PROPOSED}\nNote finale.\n`)),
  ),
  define(
    'adr/reevaluation-count',
    'aucun déclencheur',
    ['adr/reevaluation-count'],
    inMemory(mutated('- Réévaluation : Zod cesse', '- Documentation : Zod cesse')),
  ),
  define('adr/words-limit', 'un mot de trop', ['adr/words-limit'], inMemory(only(withWords(wordsToLimit + 1)))),

  define(
    'adr/link-scheme',
    'un lien http',
    ['adr/link-scheme'],
    inMemory(mutated('(https://zod.dev)', '(http://zod.dev)')),
  ),
  define(
    'adr/link-malformed',
    'un lien mal encodé',
    ['adr/link-malformed'],
    inMemory(mutated('sur [zod.dev](https://zod.dev).', 'sur [zod.dev](https://zod.dev) et [notes](caf%E9.md).')),
  ),
  define(
    'adr/mention-malformed',
    'une mention à cinq chiffres',
    ['adr/mention-malformed'],
    inMemory(mutated('Zod cesse de publier', 'ADR-00001 cesse de publier')),
  ),

  define(
    'adr/path-directory',
    'un dossier dans les ADR',
    ['adr/path-directory'],
    inMemory({ ...only(PROPOSED), 'docs/adr/brouillons/note.md': 'note' }),
  ),
  define(
    'adr/path-name',
    'un fichier au nom invalide',
    ['adr/path-name'],
    inMemory({ ...only(PROPOSED), 'docs/adr/12-Mauvais_Nom.md': PROPOSED }),
  ),
  define(
    'adr/number-duplicate',
    'deux fichiers pour ADR-0000',
    ['adr/number-duplicate'],
    inMemory({ ...only(PROPOSED), [pathFor(0, OTHER_TITLE)]: adrDocument({ title: OTHER_TITLE }) }),
  ),
  define(
    'adr/link-target-missing',
    'un lien relatif vers un fichier absent',
    ['adr/link-target-missing'],
    inMemory(
      mutated(
        'sur [zod.dev](https://zod.dev).',
        'sur [zod.dev](https://zod.dev) et [le journal](../spikes/absent.md).',
      ),
    ),
  ),
  define(
    'adr/valid-link-target',
    'un lien relatif vers un fichier présent',
    [],
    inMemory({
      ...mutated(
        'sur [zod.dev](https://zod.dev).',
        'sur [zod.dev](https://zod.dev) et [le journal](../spikes/journal.md).',
      ),
      'docs/spikes/journal.md': 'journal',
    }),
  ),
  define(
    'adr/mention-unknown',
    'une mention d’ADR inexistant',
    ['adr/mention-unknown'],
    inMemory(mutated('Zod cesse de publier', 'ADR-0009 cesse de publier')),
  ),
  define(
    'adr/supersedes-unknown',
    'un remplacement d’ADR inexistant',
    ['adr/supersedes-unknown'],
    inMemory({ ...only(PROPOSED), [ONE]: adrDocument({ title: OTHER_TITLE, supersedes: 'ADR-0009' }) }),
  ),
  define(
    'adr/supersedes-newer',
    'un remplacement d’ADR plus récent',
    ['adr/supersedes-newer'],
    inMemory({ [ZERO]: adrDocument({ supersedes: 'ADR-0001' }), [ONE]: adrDocument({ title: OTHER_TITLE }) }),
  ),
  define(
    'adr/supersedes-not-accepted',
    'un remplacement d’ADR proposé',
    ['adr/supersedes-not-accepted'],
    inMemory({ ...only(PROPOSED), [ONE]: adrDocument({ title: OTHER_TITLE, supersedes: 'ADR-0000' }) }),
  ),
  define(
    'adr/supersedes-several',
    'deux ADR acceptés remplacent le même',
    ['adr/supersedes-several'],
    inMemory(
      {
        ...only(ACCEPTED),
        [ONE]: adrDocument({ title: OTHER_TITLE, status: 'accepted', supersedes: 'ADR-0000' }),
        [pathFor(2, 'Validation des données par Joi')]: adrDocument({
          title: 'Validation des données par Joi',
          status: 'accepted',
          supersedes: 'ADR-0000',
        }),
      },
      { bindings: { 'ADR-0001': provenBinding, 'ADR-0002': provenBinding } },
    ),
  ),

  define(
    'adr/binding-malformed-id',
    'une clé de liens mal formée',
    ['adr/binding-malformed-id'],
    inMemory(only(PROPOSED), { bindings: { 'ADR-12': { scope: { paths: ['docs/adr/**'] }, rules: {} } } }),
  ),
  define(
    'adr/binding-unknown-adr',
    'des liens pour un ADR inexistant',
    ['adr/binding-unknown-adr'],
    inMemory(only(PROPOSED), { bindings: { 'ADR-0009': { scope: { paths: ['docs/adr/**'] }, rules: {} } } }),
  ),
  define(
    'adr/binding-inactive',
    'des liens pour un ADR rejeté',
    ['adr/binding-inactive'],
    inMemory(only(adrDocument({ status: 'rejected' })), { bindings: proven }),
  ),
  define('adr/binding-missing', 'un ADR accepté sans liens', ['adr/binding-missing'], inMemory(only(ACCEPTED))),
  define(
    'adr/binding-rule-unbound',
    'une règle contraignante sans preuve',
    ['adr/binding-rule-unbound'],
    inMemory(only(PROPOSED), { bindings: { 'ADR-0000': { scope: { paths: ['docs/adr/**'] }, rules: {} } } }),
  ),
  define(
    'adr/binding-rule-extra',
    'une preuve pour une règle PEUT',
    ['adr/binding-rule-extra'],
    inMemory(only(PROPOSED), {
      bindings: {
        'ADR-0000': {
          scope: { paths: ['docs/adr/**'] },
          rules: { R1: [FAKE_PROOFS.passing], R2: [FAKE_PROOFS.passing] },
        },
      },
    }),
  ),
  define(
    'adr/binding-convention-empty',
    'une convention vide',
    ['adr/binding-convention-empty'],
    inMemory(only(PROPOSED), {
      bindings: { 'ADR-0000': { scope: { paths: ['docs/adr/**'] }, rules: { R1: { convention: ' ' } } } },
    }),
  ),
  define(
    'adr/binding-proof-unknown',
    'une preuve inconnue',
    ['adr/binding-proof-unknown'],
    inMemory(only(PROPOSED), {
      bindings: { 'ADR-0000': { scope: { paths: ['docs/adr/**'] }, rules: { R1: ['fake/inconnue'] } } },
    }),
  ),
  define(
    'adr/binding-no-proven-rule',
    'un ADR accepté sans règle prouvée',
    ['adr/binding-no-proven-rule'],
    inMemory(only(ACCEPTED), {
      bindings: {
        'ADR-0000': { scope: { paths: ['docs/adr/**'] }, rules: { R1: { convention: 'relecture humaine' } } },
      },
    }),
  ),
  define(
    'adr/scope-glob-invalid',
    'un motif avec accolades',
    ['adr/scope-glob-invalid'],
    inMemory(only(PROPOSED), {
      bindings: { 'ADR-0000': { scope: { paths: ['docs/adr/{a,b}.md'] }, rules: { R1: [FAKE_PROOFS.passing] } } },
    }),
  ),
  define(
    'adr/scope-glob-duplicate',
    'un motif en double',
    ['adr/scope-glob-duplicate'],
    inMemory(only(PROPOSED), {
      bindings: {
        'ADR-0000': { scope: { paths: ['docs/adr/**', 'docs/adr/**'] }, rules: { R1: [FAKE_PROOFS.passing] } },
      },
    }),
  ),
  define(
    'adr/scope-glob-empty',
    'un motif qui ne couvre rien',
    ['adr/scope-glob-empty'],
    inMemory(only(PROPOSED), {
      bindings: { 'ADR-0000': { scope: { paths: ['packages/inexistant/**'] }, rules: { R1: [FAKE_PROOFS.passing] } } },
    }),
  ),

  define('adr/history-not-repository', 'un dossier hors de git', ['adr/history-not-repository'], async () =>
    checkPlainDirectory(only(PROPOSED)),
  ),
  define('adr/history-shallow', 'un clone superficiel', ['adr/history-shallow'], async () =>
    checkHistoryFixture({
      commits: [only(PROPOSED), mutated('alourdit le paquet', 'grossit le paquet')],
      shallow: true,
    }),
  ),
  define('adr/valid-history', 'un ADR proposé puis modifié', [], async () =>
    checkHistoryFixture({ commits: [only(PROPOSED), mutated('alourdit le paquet', 'grossit le paquet')] }),
  ),
  define('adr/valid-accepted', 'proposé puis accepté, avec une preuve liée', [], async () =>
    checkHistoryFixture({ commits: [only(PROPOSED), only(ACCEPTED)], bindings: proven }),
  ),
  define('adr/valid-superseded', 'un ADR accepté remplacé par un ADR accepté plus récent', [], async () =>
    checkHistoryFixture({
      commits: [
        only(PROPOSED),
        only(ACCEPTED),
        { ...only(ACCEPTED), [ONE]: adrDocument({ title: OTHER_TITLE, supersedes: 'ADR-0000' }) },
        { ...only(ACCEPTED), [ONE]: adrDocument({ title: OTHER_TITLE, status: 'accepted', supersedes: 'ADR-0000' }) },
      ],
      bindings: { 'ADR-0001': provenBinding },
    }),
  ),
  define(
    'adr/valid-code-block-status',
    'un ADR proposé qui cite status: accepted en code, puis modifié',
    [],
    async () =>
      checkHistoryFixture({
        commits: [
          only(withStatusExample),
          only(replaceOnce(withStatusExample, 'alourdit le paquet', 'grossit le paquet')),
        ],
      }),
  ),
  define('adr/valid-renamed-proposed', 'un ADR proposé renommé', [], async () =>
    checkHistoryFixture({
      commits: [
        only(PROPOSED),
        { [pathFor(0, 'Validation par Zod')]: replaceOnce(PROPOSED, `# ${BASE_TITLE}`, '# Validation par Zod') },
      ],
    }),
  ),
  define('adr/valid-staged-acceptance', 'acceptation dans l’index avec une preuve qui passe', [], async () =>
    checkHistoryFixture({ commits: [only(PROPOSED)], staged: only(ACCEPTED), bindings: proven, source: 'index' }),
  ),
  define('adr/valid-merge-acceptance', 'acceptation arrivée par une fusion', [], async () =>
    checkHistoryFixture({
      commits: [only(PROPOSED)],
      bindings: proven,
      afterwards: async (repository) => {
        await git(repository, ['switch', '--quiet', '-c', 'decision']);
        await writeFile(join(repository.root, ZERO), ACCEPTED);
        await git(repository, ['commit', '--quiet', '--no-verify', '-am', 'accepter']);
        await git(repository, ['switch', '--quiet', 'main']);
        await git(repository, ['merge', '--quiet', '--no-ff', '--no-verify', '-m', 'fusion', 'decision']);
      },
    }),
  ),
  define(
    'adr/transition-first-not-proposed',
    'un ADR commité directement accepté',
    ['adr/transition-first-not-proposed'],
    async () => checkHistoryFixture({ commits: [only(ACCEPTED)], bindings: proven }),
  ),
  define('adr/valid-acknowledged', 'un écart d’historique reconnu', [], async () =>
    checkHistoryFixture({
      commits: [only(ACCEPTED)],
      bindings: proven,
      acknowledgments: async (repository) => [
        {
          code: 'adr/transition-first-not-proposed',
          commit: (await resolveCommit(repository, 'HEAD')) ?? '',
          reason: 'fixture',
        },
      ],
    }),
  ),
  define('adr/acknowledgment-unused', 'un écart reconnu qui n’existe pas', ['adr/acknowledgment-unused'], async () =>
    checkHistoryFixture({
      commits: [only(PROPOSED)],
      acknowledgments: async () =>
        Promise.resolve([{ code: 'adr/frozen-modified', commit: '0'.repeat(40), reason: 'fixture' }]),
    }),
  ),
  define(
    'adr/transition-forbidden',
    'un ADR rejeté puis accepté',
    ['adr/transition-forbidden', 'adr/frozen-modified'],
    async () =>
      checkHistoryFixture({
        commits: [only(PROPOSED), only(adrDocument({ status: 'rejected' })), only(ACCEPTED)],
        bindings: proven,
      }),
  ),
  define(
    'adr/transition-uncommitted',
    'un ADR accepté jamais commité en proposé',
    ['adr/transition-uncommitted'],
    async () =>
      checkHistoryFixture({
        commits: [{ 'README.md': 'dépôt' }],
        worktree: { 'README.md': 'dépôt', ...only(ACCEPTED) },
        bindings: proven,
      }),
  ),
  define('adr/frozen-modified', 'un ADR accepté puis modifié', ['adr/frozen-modified'], async () =>
    checkHistoryFixture({
      commits: [only(PROPOSED), only(ACCEPTED)],
      worktree: only(replaceOnce(ACCEPTED, 'alourdit le paquet', 'grossit le paquet')),
      bindings: proven,
    }),
  ),
  define(
    'adr/frozen-after-unreadable',
    'un ADR accepté modifié sous un en-tête illisible, puis réparé',
    ['adr/frozen-modified'],
    async () =>
      checkHistoryFixture({
        commits: [
          only(PROPOSED),
          only(ACCEPTED),
          only(
            replaceOnce(
              replaceOnce(ACCEPTED, 'status: accepted', 'status: accepted\ndate: 2026-09-14'),
              'alourdit le paquet',
              'grossit le paquet',
            ),
          ),
        ],
        worktree: only(replaceOnce(ACCEPTED, 'alourdit le paquet', 'grossit le paquet')),
        bindings: proven,
      }),
  ),
  define('adr/frozen-renamed', 'un ADR accepté puis renommé', ['adr/frozen-renamed'], async () =>
    checkHistoryFixture({
      commits: [
        only(PROPOSED),
        only(ACCEPTED),
        { [pathFor(0, 'Validation par Zod')]: replaceOnce(ACCEPTED, `# ${BASE_TITLE}`, '# Validation par Zod') },
      ],
      bindings: proven,
    }),
  ),
  define('adr/deleted', 'un ADR commité puis supprimé', ['adr/deleted'], async () =>
    checkHistoryFixture({
      commits: [{ ...only(PROPOSED), [ONE]: adrDocument({ title: OTHER_TITLE }) }],
      worktree: only(PROPOSED),
    }),
  ),
  define(
    'adr/accept-proof-failing',
    'acceptation dans l’index avec une preuve en échec',
    ['adr/accept-proof-failing'],
    async () =>
      checkHistoryFixture({
        commits: [only(PROPOSED)],
        staged: only(ACCEPTED),
        bindings: { 'ADR-0000': { scope: { paths: ['docs/adr/**'] }, rules: { R1: [FAKE_PROOFS.failing] } } },
        source: 'index',
      }),
  ),
  define(
    'adr/decision-by-agent',
    'acceptation dans l’index depuis une session d’agent',
    ['adr/decision-by-agent'],
    async () =>
      checkHistoryFixture({
        commits: [only(PROPOSED)],
        staged: only(ACCEPTED),
        bindings: proven,
        source: 'index',
        environment: { CLAUDECODE: '1' },
      }),
  ),
] as const;

export type CheckProofId = (typeof CHECK_FIXTURES)[number]['id'];
