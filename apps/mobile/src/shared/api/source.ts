import type { ContentApi, ImageKey } from '@huma/contracts';
import { contentApi } from '@huma/mock-api';
import { VISUALS } from '@huma/mock-content';
import type { AssetWidth } from '@huma/mock-content/assets';
import { ASSETS } from '@huma/mock-content/assets';
import type { ContentSource } from '../config';

/** A picture of the corpus as the bundle holds it: the module Metro resolved at one width, and the hash painted first. */
type CorpusPicture = Readonly<{ module: number; thumbhash: string }>;

/**
 * What a build reads the paper from: the source's name, the content it serves, and the one thing a source answers that
 * the contract does not carry — the picture a key of the corpus names, which only a build carrying the corpus can draw.
 */
export type Source = Readonly<{
  name: ContentSource;
  content: ContentApi;
  corpusPicture: (key: ImageKey, width: AssetWidth) => CorpusPicture | null;
}>;

/**
 * The corpus: the simulated paper, its pictures and the API that serves them.
 *
 * This module is the default, and the one TypeScript and the tests see. A build that reads the journal's service
 * bundles `source.service.ts` in its place — Metro resolves a module's service variant first in that build — so
 * nothing this module imports reaches that bundle: neither the paper, nor its 189 pictures, nor the parsing and the
 * indexing the API does when it loads. A key that names no picture draws nothing rather than a broken view: the corpus
 * generator writes a file per key, and a screen that outlives that promise should show its words alone.
 */
export const SOURCE: Source = {
  name: 'mock',
  content: contentApi,
  corpusPicture: (key, width) => {
    const widths = ASSETS[key];
    const thumbhash = VISUALS[key];
    return widths === undefined || thumbhash === undefined ? null : { module: widths[width], thumbhash };
  },
};
