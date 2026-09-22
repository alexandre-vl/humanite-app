import { z } from 'zod';

/** The shape of an item: a written article, a video, or an opinion column. */
export const ARTICLE_FORMAT = z.enum(['article', 'video', 'column']);
export type ArticleFormat = z.infer<typeof ARTICLE_FORMAT>;

/** Whether an item is free or reserved to subscribers. */
export const ACCESS = z.enum(['free', 'premium']);
export type Access = z.infer<typeof ACCESS>;
