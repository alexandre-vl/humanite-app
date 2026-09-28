import { describe, expect, expectTypeOf, test } from 'vitest';
import { ARTICLE_ID, ARTICLE_SLUG, IMAGE_KEY, SECTION_ID, slugOfPage } from './ids.ts';
import type { ArticleId, ArticleSlug, ImageKey, SectionId } from './ids.ts';

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

describe('ARTICLE_SLUG', () => {
  test('accepts the name the journal’s site gives an article, figures included, and brands it', () => {
    const slug = ARTICLE_SLUG.parse('budget-2027-alerte-enlevement-ou-sont-les-5-milliards');
    expectTypeOf(slug).toEqualTypeOf<ArticleSlug>();
    expect(slug).toBe('budget-2027-alerte-enlevement-ou-sont-les-5-milliards');
  });

  test('rejects what the site never writes: a capital, an accent, a doubled or trailing hyphen, nothing', () => {
    for (const odd of ['Budget-2027', 'élections', 'budget--2027', 'budget-', '']) {
      expect(ARTICLE_SLUG.safeParse(odd).success).toBe(false);
    }
  });
});

describe('slugOfPage', () => {
  // The address a body of the capture links an article at, and the same address as a campaign would tag it.
  const PAGE =
    'https://www.humanite.fr/politique/clemence-guette/un-pacs-ameliore-les-propositions-de-clemence-guette-pour-faire-reconnaitre-legalement-lamitie';
  const SLUG = 'un-pacs-ameliore-les-propositions-de-clemence-guette-pour-faire-reconnaitre-legalement-lamitie';

  test('reads the slug an article’s page ends with, whatever query, fragment or last slash follows it', () => {
    for (const address of [PAGE, `${PAGE}/`, `${PAGE}?utm_source=onesignal`, `${PAGE}#commentaires`]) {
      expect(slugOfPage(address)).toBe(SLUG);
    }
    expect(slugOfPage(PAGE.replace('www.', ''))).toBe(SLUG);
  });

  test('names no article for an address that is not an article’s page of the journal', () => {
    for (const address of [
      'https://www.humanite.fr/',
      `https://www.humanite.fr/${SLUG}`,
      'https://www.humanite.fr/./politique/',
      'http://www.humanite.fr/politique/clemence-guette/un-pacs',
      'https://www.humanite.fr.example.org/politique/clemence-guette/un-pacs',
      'https://exemple.fr/politique/clemence-guette/un-pacs',
      'https://www.humanite.fr/politique/clemence-guette/Un-PACS',
      'pas une adresse',
    ]) {
      expect(slugOfPage(address)).toBeNull();
    }
  });
});
