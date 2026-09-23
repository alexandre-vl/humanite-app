import type { Article, ArticleFormat, Block, ImageKey, SectionId } from '@huma/contracts';
import type { CorpusArticle } from './item.ts';
import { blocksOf, instantAt, textOf, typeset } from '@huma/contracts';
import { AUTHORS, codeOf, namesOf, quotaOf, SECTIONS } from './registries.ts';

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
 * How many a section holds is `SLOTS`'s to say, and not this grammar's.
 */
export const isBrief = (article: Article): boolean => /-b\d+$/u.test(article.id);

/** What every section of the corpus holds: six articles, then three briefs. */
const SLOTS = { articles: 6, briefs: 3 } as const;

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

/** Whether each element the section bar needs appears somewhere in a section, and what to say when it does not. */
const presence = (articles: readonly Article[]): readonly Readonly<{ missing: string; ok: boolean }>[] => {
  const blocks = articles.flatMap((article) => blocksOf(article));
  const spans = blocks.flatMap((block) => (block.type === 'paragraph' || block.type === 'quote' ? block.spans : []));
  return [
    { missing: 'aucun intertitre', ok: blocks.some((block) => block.type === 'heading') },
    { missing: 'aucune citation', ok: blocks.some((block) => block.type === 'quote') },
    { missing: 'aucune image', ok: blocks.some((block) => block.type === 'image') },
    { missing: 'aucun lien', ok: spans.some((span) => span.type === 'link') },
    { missing: 'aucune mise en italique', ok: spans.some((span) => span.type === 'emphasis') },
  ];
};

const checkItem = ({ folder, article }: Item): readonly string[] => {
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
  // Every text a screen draws is set the French way, the journal's read from its service as the corpus's read from its
  // files: a text still set some other way reached a screen by some path that skipped the one rule.
  const texts = [
    article.title,
    article.standfirst ?? '',
    article.hero?.caption ?? '',
    article.hero?.credit ?? '',
    ...blocksOf(article).map(textOf),
  ];
  const loose = texts.filter((text) => typeset(text) !== text);
  if (loose.length > 0) {
    errors.push(`${where} : ${String(loose.length)} texte(s) à composer à la française, dont « ${loose[0] ?? ''} »`);
  }
  for (const [field, text, bounds] of [
    ['titre', article.title, SIGNS.title],
    ['chapô', article.standfirst ?? '', SIGNS.standfirst],
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
  return errors;
};

const checkSection = (folder: SectionId, articles: readonly Article[]): readonly string[] => {
  const errors: string[] = [];
  const arts = articles.filter((article) => !isBrief(article));
  const briefs = articles.filter(isBrief);
  const quota = quotaOf(folder);
  const counts = {
    video: articles.filter((article) => article.format === 'video').length,
    column: articles.filter((article) => article.format === 'column').length,
  };
  if (arts.length !== SLOTS.articles || briefs.length !== SLOTS.briefs) {
    errors.push(
      `${folder} : ${String(arts.length)} articles / ${String(briefs.length)} brèves ` +
        `(${String(SLOTS.articles)} / ${String(SLOTS.briefs)} attendus)`,
    );
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
  for (const { missing, ok } of presence(articles)) {
    if (!ok) {
      errors.push(`${folder} : ${missing}`);
    }
  }
  return errors;
};

/** Every rule the corpus must meet, beyond the field shapes `ARTICLE` already checks. */
export function validateCorpus(items: readonly Item[]): readonly string[] {
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
    ...items.flatMap(checkItem),
    ...SECTIONS.flatMap((section) =>
      checkSection(
        section.id,
        items.filter((item) => item.folder === section.id).map((item) => item.article),
      ),
    ),
  ];
}
