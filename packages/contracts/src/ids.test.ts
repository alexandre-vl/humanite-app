import { describe, expect, expectTypeOf, test } from 'vitest';
import { ARTICLE_ID, AUTHOR_ID, IMAGE_KEY, SECTION_ID } from './index.ts';
import type { ArticleId, AuthorId, ImageKey, SectionId } from './index.ts';

describe('ARTICLE_ID', () => {
  test('accepts a well-formed id and brands it', () => {
    const id = ARTICLE_ID.parse('pol-a1');
    expectTypeOf(id).toEqualTypeOf<ArticleId>();
    expect(id).toBe('pol-a1');
  });

  test('rejects a slot out of range and a bare slug', () => {
    expect(ARTICLE_ID.safeParse('pol-a7').success).toBe(false);
    expect(ARTICLE_ID.safeParse('politique').success).toBe(false);
  });
});

describe('IMAGE_KEY', () => {
  test('is the id of the item it illustrates, then what it shows', () => {
    expectTypeOf(IMAGE_KEY.parse('pol-a5-hero')).toEqualTypeOf<ImageKey>();
    expect(IMAGE_KEY.safeParse('cul-a2-galerie').success).toBe(true);
    expect(IMAGE_KEY.safeParse('pol-a1-car-scolaire').success).toBe(true);
  });

  test('rejects a key that names no item, and an item id on its own', () => {
    expect(IMAGE_KEY.safeParse('galerie').success).toBe(false);
    expect(IMAGE_KEY.safeParse('pol-a1').success).toBe(false);
    expect(IMAGE_KEY.safeParse('pol-a7-hero').success).toBe(false);
  });
});

describe('SECTION_ID', () => {
  test('accepts a hyphenated slug', () => {
    expectTypeOf(SECTION_ID.parse('culture-et-savoir')).toEqualTypeOf<SectionId>();
  });

  test('rejects an empty or capitalised slug', () => {
    expect(SECTION_ID.safeParse('').success).toBe(false);
    expect(SECTION_ID.safeParse('Politique').success).toBe(false);
  });
});

describe('AUTHOR_ID', () => {
  test('accepts a kebab-case name', () => {
    expectTypeOf(AUTHOR_ID.parse('lucie-varenne')).toEqualTypeOf<AuthorId>();
  });

  test('rejects spaces', () => {
    expect(AUTHOR_ID.safeParse('lucie varenne').success).toBe(false);
  });
});
