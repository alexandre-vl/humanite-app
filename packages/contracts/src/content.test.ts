import { expect, expectTypeOf, test } from 'vitest';
import { BLOCK } from './article.ts';
import type { Block } from './article.ts';
import { SECTION, SPAN } from './content.ts';
import type { Section, Span } from './content.ts';

test('SPAN parses each inline kind, and a link only to a page of the web', () => {
  expectTypeOf(SPAN.parse({ type: 'text', text: 'x' })).toEqualTypeOf<Span>();
  expect(SPAN.safeParse({ type: 'strong', text: 'x' }).success).toBe(true);
  expect(SPAN.safeParse({ type: 'link', text: 'x', url: 'https://example.org/a' }).success).toBe(true);
  expect(SPAN.safeParse({ type: 'link', text: 'x', url: 'http://example.org/a' }).success).toBe(true);
  // The journal links nowhere but the web: an address into the corpus, a mail or no address at all is no link.
  expect(SPAN.safeParse({ type: 'link', text: 'x', url: 'article:pol-a1' }).success).toBe(false);
  expect(SPAN.safeParse({ type: 'link', text: 'x', url: 'mailto:redaction@example.org' }).success).toBe(false);
  expect(SPAN.safeParse({ type: 'link', text: 'x', url: 'not-a-url' }).success).toBe(false);
});

test('BLOCK parses each block kind and rejects an unknown one', () => {
  const block: Block = BLOCK.parse({ type: 'paragraph', spans: [{ type: 'text', text: 'x' }] });
  expectTypeOf(block).toEqualTypeOf<Block>();
  expect(BLOCK.safeParse({ type: 'heading', text: 'Titre' }).success).toBe(true);
  expect(BLOCK.safeParse({ type: 'quote', spans: [{ type: 'text', text: 'x' }] }).success).toBe(true);
  expect(
    BLOCK.safeParse({ type: 'image', picture: { kind: 'corpus', key: 'pol-a1-hero' }, caption: 'c' }).success,
  ).toBe(true);
  expect(BLOCK.safeParse({ type: 'image', caption: 'c', key: 'pol-a1-hero' }).success).toBe(false);
  // A film is the item's, where it plays, and not a block of a body: no body of the journal carries one.
  expect(BLOCK.safeParse({ type: 'video', title: 'T', durationSeconds: 192 }).success).toBe(false);
  // A card pointing at another article is no block: the journal's service sends a body none.
  const pointed = {
    id: 'pol-a2',
    format: 'article',
    access: 'free',
    title: 'Un titre',
    standfirst: 'Un chapô.',
    publishedAt: '2026-09-10T08:30:00.000Z',
  };
  expect(BLOCK.safeParse({ type: 'related', summary: pointed }).success).toBe(false);
  expect(BLOCK.safeParse({ type: 'callout', title: 'T', text: 'x', button: 'Voir' }).success).toBe(false);
  expect(BLOCK.safeParse({ type: 'sidebar' }).success).toBe(false);
});

test('SECTION reads a slug and the name the newsroom prints, and nothing else', () => {
  const section: Section = SECTION.parse({ id: 'culture-et-savoir', label: 'Culture et savoir', order: 5 });
  expectTypeOf(section).toEqualTypeOf<Section>();
  expect(section).toEqual({ id: 'culture-et-savoir', label: 'Culture et savoir' });
  expect(SECTION.safeParse({ id: '19569', label: 'Culture et savoir' }).success).toBe(false);
});
