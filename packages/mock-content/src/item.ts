import type { Article, SectionId } from '@huma/contracts';

/**
 * An item of the corpus: an article of the domain, and the section it was written for.
 *
 * The domain carries no section — the journal's service says of no item where it ran, and a screen shows none — but a
 * corpus is written section by section, filed in a folder per section and held to a quota in each, and the mock that
 * stands in for the service serves a section's own list from it. So the section is the corpus's own field, kept here
 * beside the article and never handed to a screen.
 */
export type CorpusArticle = Article & Readonly<{ section: SectionId }>;
