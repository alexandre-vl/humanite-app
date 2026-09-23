import { z } from 'zod';

/**
 * The shape of an item, as the paper presents it: a written article, a video, a piece of opinion, a chapter of a
 * series, or the running coverage of an event. Each is what the journal's service says an item is; what a screen does
 * with each is written down once, beside the screens.
 */
export const ARTICLE_FORMAT = z.enum(['article', 'video', 'column', 'series', 'live']);
export type ArticleFormat = z.infer<typeof ARTICLE_FORMAT>;

/** Whether an item is free or reserved to subscribers. */
export const ACCESS = z.enum(['free', 'premium']);
export type Access = z.infer<typeof ACCESS>;
