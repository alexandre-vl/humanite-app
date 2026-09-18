import type { Article, ArticleId, Block, ImageKey, SectionId, Span } from '@huma/contracts';
import { AUTHORS, SECTIONS } from './registries.ts';
import { toInstant } from './time.ts';

type Quota = Readonly<{ video: number; column: number; callout: number }>;

/** Per-section counts of the special formats, by section slug. */
const EXPECTED = new Map<string, Quota>([
  ['politique', { video: 1, column: 0, callout: 0 }],
  ['social-eco', { video: 0, column: 1, callout: 0 }],
  ['societe', { video: 0, column: 0, callout: 0 }],
  ['monde', { video: 1, column: 1, callout: 0 }],
  ['culture-et-savoir', { video: 1, column: 1, callout: 1 }],
  ['feminisme', { video: 0, column: 0, callout: 0 }],
  ['environnement', { video: 0, column: 0, callout: 0 }],
  ['sport', { video: 1, column: 0, callout: 0 }],
]);

/** Accepted word counts per item kind. */
const WORDS: Readonly<Record<string, Readonly<{ min: number; max: number }>>> = {
  article: { min: 300, max: 800 },
  video: { min: 120, max: 420 },
  column: { min: 350, max: 700 },
  brief: { min: 50, max: 180 },
};

/** The newsroom hours the corpus covers, written on its own clock and compared as instants. */
const WINDOW = { start: toInstant('2026-09-10 07:00'), end: toInstant('2026-09-13 09:55') } as const;

/** What a report of the newspaper runs, in seconds: under a minute is a mistake, a quarter of an hour is a film. */
const RUNNING_TIME = { min: 60, max: 900 } as const;

/** An item with the section folder it was read from. */
type Item = Readonly<{ folder: SectionId; article: Article }>;

const countWords = (text: string): number => text.split(/\s+/u).filter((word) => word.length > 0).length;

const spanText = (span: Span): string => ('value' in span ? span.value : span.text);

const blockWords = (block: Block): number => {
  if (block.type === 'heading') {
    return countWords(block.text);
  }
  if (block.type === 'paragraph') {
    return countWords(block.spans.map(spanText).join(' '));
  }
  if (block.type === 'quote') {
    return countWords([...block.spans.map(spanText), block.source ?? ''].join(' '));
  }
  return 0;
};

const wordCount = (article: Article): number => article.blocks.reduce((sum, block) => sum + blockWords(block), 0);

const wordRange = (article: Article): Readonly<{ min: number; max: number }> =>
  WORDS[article.kind === 'brief' ? 'brief' : article.format] ?? { min: 0, max: Number.POSITIVE_INFINITY };

/** Every picture an item names: its lead illustration, then the images of its body. */
const imageKeys = (article: Article): readonly ImageKey[] => [
  ...(article.hero === undefined ? [] : [article.hero.key]),
  ...article.blocks.flatMap((block) => (block.type === 'image' ? [block.key] : [])),
];

/** The ids an item points to, through internal links and related blocks. */
const linkedIds = (article: Article): readonly ArticleId[] =>
  article.blocks.flatMap((block): readonly ArticleId[] => {
    if (block.type === 'related') {
      return [block.id];
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
  const blocks = articles.flatMap((article) => article.blocks);
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
  const section = SECTIONS.find((each) => each.id === folder);
  const authors = article.authors.map((id) => AUTHORS.find((each) => each.id === id));
  const known = authors.filter((each) => each !== undefined);
  const kinds = article.blocks.map((block) => block.type);
  const range = wordRange(article);
  const words = wordCount(article);

  if (article.section !== folder) {
    errors.push(`${where} : section « ${article.section} » ≠ dossier « ${folder} »`);
  }
  if (section !== undefined && !article.id.startsWith(`${section.code}-`)) {
    errors.push(`${where} : id hors de la rubrique « ${section.code} »`);
  }
  if (/-b[1-3]$/u.test(article.id) !== (article.kind === 'brief')) {
    errors.push(`${where} : préfixe d’id et kind incohérents`);
  }
  if (article.title === article.title.toUpperCase()) {
    errors.push(`${where} : titre tout en capitales`);
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
  if (
    (article.format === 'article' || article.format === 'video') &&
    article.kind === 'article' &&
    article.hero === undefined
  ) {
    errors.push(`${where} : hero obligatoire pour un article ou une vidéo`);
  }
  if (article.format === 'column' && article.hero !== undefined) {
    errors.push(`${where} : pas de hero pour une chronique`);
  }
  if (article.emphasis !== undefined && article.kind !== 'brief') {
    errors.push(`${where} : emphasis réservé à une brève`);
  }
  if (article.kind === 'brief' && kinds.some((kind) => kind !== 'paragraph')) {
    errors.push(`${where} : une brève ne contient que des paragraphes`);
  }
  if (article.kind === 'brief' && article.blocks.length > 3) {
    errors.push(`${where} : une brève a au plus trois paragraphes`);
  }
  if (article.format === 'video' && kinds[0] !== 'video') {
    errors.push(`${where} : une vidéo commence par ::video`);
  }
  if (kinds.filter((kind) => kind === 'video').length !== (article.format === 'video' ? 1 : 0)) {
    errors.push(`${where} : une ::video ne paraît que dans un item vidéo`);
  }
  if (
    article.blocks.some(
      (block) =>
        block.type === 'video' &&
        (block.durationSeconds < RUNNING_TIME.min || block.durationSeconds > RUNNING_TIME.max),
    )
  ) {
    errors.push(`${where} : durée de vidéo hors de ${String(RUNNING_TIME.min)}–${String(RUNNING_TIME.max)} s`);
  }
  if (article.format === 'column' && kinds.includes('image')) {
    errors.push(`${where} : pas d’image dans une chronique`);
  }
  if (article.format === 'article' && article.kind === 'article' && !kinds.includes('heading')) {
    errors.push(`${where} : au moins un intertitre dans un article`);
  }
  if (words < range.min || words > range.max) {
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
  const arts = articles.filter((article) => article.kind === 'article');
  const briefs = articles.filter((article) => article.kind === 'brief');
  const quota = EXPECTED.get(folder);
  const counts = {
    video: articles.filter((article) => article.format === 'video').length,
    column: articles.filter((article) => article.format === 'column').length,
    callout: articles.reduce((sum, article) => sum + article.blocks.filter((b) => b.type === 'callout').length, 0),
  };
  if (arts.length !== 6 || briefs.length !== 3) {
    errors.push(`${folder} : ${String(arts.length)} articles / ${String(briefs.length)} brèves (6 / 3 attendus)`);
  }
  if (arts.filter((article) => article.access === 'premium').length !== 2) {
    errors.push(`${folder} : deux articles premium attendus`);
  }
  if (briefs.filter((article) => article.emphasis === true).length !== 1) {
    errors.push(`${folder} : une brève emphasis attendue`);
  }
  if (quota !== undefined) {
    for (const key of ['video', 'column', 'callout'] as const) {
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
