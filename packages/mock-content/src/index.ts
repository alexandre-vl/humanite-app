import { ARTICLE, SECTION_ID } from '@huma/contracts';
import { CORPUS_DATA } from './generated/corpus.ts';
import type { CorpusArticle } from './item.ts';

export { VISUALS } from './generated/visuals.ts';
export { AUTHORS, SECTIONS } from './registries.ts';
export type { CorpusArticle } from './item.ts';

/** Every item of the fictional corpus, revalidated against the contracts when the module loads, with its section. */
export const CORPUS: readonly CorpusArticle[] = CORPUS_DATA.map((entry) => ({
  ...ARTICLE.parse(entry),
  section: SECTION_ID.parse(entry.section),
}));
