import { mkdirSync, writeFileSync } from 'node:fs';
import type { SectionCode } from '@huma/design-tokens';
import sharp from 'sharp';
import { rgbaToThumbHash } from 'thumbhash';
import { VISUAL_WIDTHS, artworkSvg } from './artwork.ts';

/** Where the written pictures live, beside the corpus the generator writes. */
export const IMAGES = new URL('./generated/images/', import.meta.url);

/** The name a picture is written under, at one width. */
export const imageName = (key: string, width: number): string => `${key}-${String(width)}.webp`;

/** What the app needs besides the pictures: the placeholder it paints while one loads. */
export type Visual = Readonly<{ key: string; thumbhash: string }>;

/**
 * Writes one picture at each width and returns its placeholder. The hash is taken from a small raster of the same
 * drawing, which is what thumbhash is built to read; 64 pixels wide is well inside the 100 it accepts.
 */
export const renderVisual = async (key: string, code: SectionCode): Promise<Visual> => {
  mkdirSync(IMAGES, { recursive: true });
  const svg = Buffer.from(artworkSvg(key, code));
  for (const width of VISUAL_WIDTHS) {
    const picture = await sharp(svg).resize({ width }).webp({ quality: 80 }).toBuffer();
    writeFileSync(new URL(imageName(key, width), IMAGES), picture);
  }
  const small = await sharp(svg).resize({ width: 64 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const hash = rgbaToThumbHash(small.info.width, small.info.height, small.data);
  return { key, thumbhash: Buffer.from(hash).toString('base64') };
};
