import { z } from 'zod';

/** Whether an item is a full article or a short brief. */
export const ARTICLE_KIND = z.enum(['article', 'brief']);
export type ArticleKind = z.infer<typeof ARTICLE_KIND>;

/** The shape of an item: a written article, a video, or an opinion column. */
export const ARTICLE_FORMAT = z.enum(['article', 'video', 'column']);
export type ArticleFormat = z.infer<typeof ARTICLE_FORMAT>;

/** Whether an item is free or reserved to subscribers. */
export const ACCESS = z.enum(['free', 'premium']);
export type Access = z.infer<typeof ACCESS>;
