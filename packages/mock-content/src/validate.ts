import type { Article, ArticleFormat, ArticleId, Block, ImageKey, SectionId } from '@huma/contracts';
import type { CorpusArticle } from './item.ts';
import { blocksOf, instantAt, SECTION_ID, textOf } from '@huma/contracts';
import { AUTHORS, codeOf, namesOf, SECTIONS } from './registries.ts';

type Quota = Readonly<{ video: number; column: number }>;

/**
 * Per-section counts of the special formats, by section slug.
 *
 * A section id is a brand and not a closed union, so no type can say this table answers for every section the registry
 * names. Two things are done instead: each key is read through the brand, so a slug of the wrong shape stops the
 * module, and a section the table has no line for is reported below rather than quietly exempted from every quota it
 * should have had.
 */
const QUOTAS: readonly (readonly [string, Quota])[] = [
  ['politique', { video: 1, column: 0 }],
  ['social-eco', { video: 0, column: 1 }],
  ['societe', { video: 0, column: 0 }],
  ['monde', { video: 1, column: 1 }],
  ['culture-et-savoir', { video: 1, column: 1 }],
  ['feminisme', { video: 0, column: 0 }],
  ['environnement', { video: 0, column: 0 }],
  ['sport', { video: 1, column: 0 }],
];

const EXPECTED: ReadonlyMap<SectionId, Quota> = new Map(
  QUOTAS.map(([id, quota]): readonly [SectionId, Quota] => [SECTION_ID.parse(id), quota]),
);

/** What a length is measured against. */
type Words = Readonly<{ min: number; max: number }>;

/**
 * The formats this corpus writes. The journal's series and its running coverage are formats of the journal alone: no
 * item of the corpus is one, and an item that said it was would be held to no length at all, so it is refused.
 */
const WRITTEN = ['article', 'video', 'column'] as const satisfies readonly ArticleFormat[];
type Written = (typeof WRITTEN)[number];

const isWritten = (format: ArticleFormat): format is Written => WRITTEN.some((each) => each === format);

/**
 * Accepted word counts per item kind. Keyed by the formats this corpus writes and not by `string`, so a format the
 * corpus starts writing stops the build here rather than leaving every item of it exempt from any length.
 */
const WORDS = {
  article: { min: 300, max: 800 },
  video: { min: 120, max: 420 },
  column: { min: 350, max: 700 },
  brief: { min: 50, max: 180 },
} as const satisfies Readonly<Record<Written | 'brief', Words>>;

/**
 * What a title and a standfirst of this corpus measure.
 *
 * The domain holds no such bound, the journal's own items breaking any it could: a title of fifty signs misses one
 * item in six and a standfirst of a hundred and fifty one in two. A corpus is written, so it can be held to them — and
 * it is, or the shapes the screens were drawn against drift.
 */
const SIGNS = {
  title: { min: 50, max: 140 },
  standfirst: { min: 150, max: 300 },
} as const satisfies Readonly<Record<string, Words>>;

/** How many names an item of this corpus is signed with. */
const SIGNATURES = { min: 1, max: 2 } as const satisfies Words;

/** A newsroom stamp this module writes itself, and so knows to be one: an instant, or a stop if it ever is not. */
const written = (stamp: string): string => {
  const instant = instantAt(stamp);
  if (instant === null) {
    throw new RangeError(`horodatage illisible : ${stamp}`);
  }
  return instant;
};

/** The newsroom hours the corpus covers, written on its own clock and compared as instants. */
const WINDOW = { start: written('2026-09-10 07:00'), end: written('2026-09-13 09:55') } as const;

/** An item with the section folder it was read from. */
type Item = Readonly<{ folder: SectionId; article: CorpusArticle }>;

const countWords = (text: string): number => text.split(/\s+/u).filter((word) => word.length > 0).length;

/** The blocks whose words an article's length is measured in: its prose, and not what is laid beside it. */
const PROSE: ReadonlySet<Block['type']> = new Set(['heading', 'paragraph', 'quote']);

const blockWords = (block: Block): number => (PROSE.has(block.type) ? countWords(textOf(block)) : 0);

const wordCount = (article: Article): number => blocksOf(article).reduce((sum, block) => sum + blockWords(block), 0);

/**
 * Whether an item of this corpus is a brief, read off its own id: `pol-a1` is an article, `pol-b1` a brief.
 *
 * The domain draws no such line — a feed calls an item short when it comes without a picture, and the journal's
 * service distinguishes nothing of the kind — so the corpus's naming rule is the one place the distinction is written.
 */
const isBrief = (article: Article): boolean => /-b[1-3]$/u.test(article.id);

/** The length an item is held to, or none for an item of a format this corpus does not write. */
const wordRange = (article: Article): Words | undefined => {
  if (isBrief(article)) {
    return WORDS.brief;
  }
  return isWritten(article.format) ? WORDS[article.format] : undefined;
};

/**
 * Every picture of the corpus an item names: its lead illustration, then the images of its body. A lead picture of the
 * journal names no file of the corpus, so it is not one of them — and no item of this corpus carries one.
 */
export const imageKeys = (article: Article): readonly ImageKey[] => [
  ...(article.hero?.picture.kind === 'corpus' ? [article.hero.picture.key] : []),
  ...blocksOf(article).flatMap((block) =>
    block.type === 'image' && block.picture.kind === 'corpus' ? [block.picture.key] : [],
  ),
];

/** The ids an item points to, through internal links and related blocks. */
const linkedIds = (article: Article): readonly ArticleId[] =>
  blocksOf(article).flatMap((block): readonly ArticleId[] => {
    if (block.type === 'related') {
      return [block.summary.id];
    }
    if (block.type === 'paragraph' || block.type === 'quote') {
      return block.spans.flatMap((span) =>
        span.type === 'link' && span.target.kind === 'article' ? [span.target.id] : [],
      );
    }
    return [];
  });

/** Whether each element the section bar needs appears somewhere in a section. */
const presence = (articles: readonly Article[]): readonly Readonly<{ label: string; ok: boolean }>[] => {
  const blocks = articles.flatMap((article) => blocksOf(article));
  const spans = blocks.flatMap((block) => (block.type === 'paragraph' || block.type === 'quote' ? block.spans : []));
  return [
    { label: 'un intertitre', ok: blocks.some((block) => block.type === 'heading') },
    {
      label: 'une citation avec source',
      ok: blocks.some((block) => block.type === 'quote' && block.source !== undefined),
    },
    { label: 'une image', ok: blocks.some((block) => block.type === 'image') },
    { label: 'un ::related', ok: blocks.some((block) => block.type === 'related') },
    { label: 'un lien interne', ok: spans.some((span) => span.type === 'link' && span.target.kind === 'article') },
    { label: 'un lien externe', ok: spans.some((span) => span.type === 'link' && span.target.kind === 'external') },
    { label: 'une mise en italique', ok: spans.some((span) => span.type === 'emphasis') },
  ];
};

const checkItem = ({ folder, article }: Item, ids: ReadonlySet<ArticleId>): readonly string[] => {
  const errors: string[] = [];
  const where = article.id;
  const code = codeOf(folder);
  const authors = namesOf(article.byline).map((name) => AUTHORS.find((each) => each.name === name));
  const known = authors.filter((each) => each !== undefined);
  const kinds = blocksOf(article).map((block) => block.type);
  const range = wordRange(article);
  const words = wordCount(article);

  if (article.section !== folder) {
    errors.push(`${where} : section « ${article.section} » ≠ dossier « ${folder} »`);
  }
  if (code !== undefined && !article.id.startsWith(`${code}-`)) {
    errors.push(`${where} : id hors de la rubrique « ${code} »`);
  }
  if (article.title === article.title.toUpperCase()) {
    errors.push(`${where} : titre tout en capitales`);
  }
  for (const [field, text, bounds] of [
    ['titre', article.title, SIGNS.title],
    ['chapô', article.standfirst, SIGNS.standfirst],
  ] as const) {
    if (text.length < bounds.min || text.length > bounds.max) {
      errors.push(
        `${where} : ${field} de ${String(text.length)} signes (attendu ${String(bounds.min)} à ${String(bounds.max)})`,
      );
    }
  }
  if (authors.length < SIGNATURES.min || authors.length > SIGNATURES.max) {
    errors.push(
      `${where} : ${String(authors.length)} auteur(s) (attendu ${String(SIGNATURES.min)} à ${String(SIGNATURES.max)})`,
    );
  }
  if (authors.length !== known.length) {
    errors.push(`${where} : auteur inconnu`);
  }
  if (article.format === 'column') {
    if (known.length !== 1 || !known.every((each) => each.isColumnist && each.section === folder)) {
      errors.push(`${where} : une chronique porte le seul chroniqueur de la rubrique`);
    }
  } else if (known.some((each) => each.isColumnist || each.section !== folder)) {
    errors.push(`${where} : auteurs non chroniqueurs de la rubrique attendus`);
  }
  if ((article.format === 'article' || article.format === 'video') && !isBrief(article) && article.hero === undefined) {
    errors.push(`${where} : hero obligatoire pour un article ou une vidéo`);
  }
  if (article.format === 'column' && article.hero !== undefined) {
    errors.push(`${where} : pas de hero pour une chronique`);
  }
  if (isBrief(article) && kinds.some((kind) => kind !== 'paragraph')) {
    errors.push(`${where} : une brève ne contient que des paragraphes`);
  }
  if (isBrief(article) && blocksOf(article).length > 3) {
    errors.push(`${where} : une brève a au plus trois paragraphes`);
  }
  if (article.format === 'column' && kinds.includes('image')) {
    errors.push(`${where} : pas d’image dans une chronique`);
  }
  if (article.format === 'article' && !isBrief(article) && !kinds.includes('heading')) {
    errors.push(`${where} : au moins un intertitre dans un article`);
  }
  if (range === undefined) {
    errors.push(`${where} : format « ${article.format} » que ce corpus n’écrit pas`);
  } else if (words < range.min || words > range.max) {
    errors.push(`${where} : ${String(words)} mots hors de ${String(range.min)}–${String(range.max)}`);
  }
  if (article.publishedAt < WINDOW.start || article.publishedAt > WINDOW.end) {
    errors.push(`${where} : date de publication hors de la fenêtre du corpus`);
  }
  for (const key of imageKeys(article)) {
    if (!key.startsWith(`${article.id}-`)) {
      errors.push(`${where} : clé d’image « ${key} » hors de l’item`);
    }
  }
  for (const target of linkedIds(article)) {
    if (target === article.id) {
      errors.push(`${where} : lien vers lui-même`);
    } else if (!ids.has(target)) {
      errors.push(`${where} : lien vers un id inexistant « ${target} »`);
    }
  }
  return errors;
};

const checkSection = (folder: SectionId, articles: readonly Article[]): readonly string[] => {
  const errors: string[] = [];
  const arts = articles.filter((article) => !isBrief(article));
  const briefs = articles.filter(isBrief);
  const quota = EXPECTED.get(folder);
  const counts = {
    video: articles.filter((article) => article.format === 'video').length,
    column: articles.filter((article) => article.format === 'column').length,
  };
  if (arts.length !== 6 || briefs.length !== 3) {
    errors.push(`${folder} : ${String(arts.length)} articles / ${String(briefs.length)} brèves (6 / 3 attendus)`);
  }
  if (arts.filter((article) => article.access === 'premium').length !== 2) {
    errors.push(`${folder} : deux articles premium attendus`);
  }
  if (quota === undefined) {
    errors.push(`${folder} : aucun quota de formats déclaré pour cette rubrique`);
  } else {
    for (const key of ['video', 'column'] as const) {
      if (counts[key] !== quota[key]) {
        errors.push(`${folder} : ${String(counts[key])} ${key} (attendu ${String(quota[key])})`);
      }
    }
  }
  for (const { label, ok } of presence(articles)) {
    if (!ok) {
      errors.push(`${folder} : aucun ${label}`);
    }
  }
  return errors;
};

/** Every rule the corpus must meet, beyond the field shapes `ARTICLE` already checks. */
export function validateCorpus(items: readonly Item[]): readonly string[] {
  const ids = new Set(items.map((item) => item.article.id));
  const seen = new Set<ImageKey>();
  const twice = new Set<ImageKey>();
  for (const key of items.flatMap((item) => imageKeys(item.article))) {
    if (seen.has(key)) {
      twice.add(key);
    }
    seen.add(key);
  }
  return [
    ...[...twice].map((key) => `clé d’image « ${key} » employée par deux items`),
    ...items.flatMap((item) => checkItem(item, ids)),
    ...SECTIONS.flatMap((section) =>
      checkSection(
        section.id,
        items.filter((item) => item.folder === section.id).map((item) => item.article),
      ),
    ),
  ];
}
