import { ARTICLE } from '@huma/contracts';
import type { Article } from '@huma/contracts';
import { CORPUS_DATA } from './generated/corpus.ts';

export { AUTHORS, SECTIONS } from './registries.ts';

/** Every item of the fictional corpus, revalidated against the contracts when the module loads. */
export const CORPUS: readonly Article[] = ARTICLE.array().parse(CORPUS_DATA);
