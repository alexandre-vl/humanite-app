import { expect, expectTypeOf, test } from 'vitest';
import { BLOCK } from './article.ts';
import type { Block } from './article.ts';
import { SECTION, SPAN } from './content.ts';
import type { Section, Span } from './content.ts';

test('SPAN parses each inline kind and validates a link target', () => {
  expectTypeOf(SPAN.parse({ type: 'text', value: 'x' })).toEqualTypeOf<Span>();
  expect(SPAN.safeParse({ type: 'strong', value: 'x' }).success).toBe(true);
  expect(SPAN.safeParse({ type: 'link', text: 'x', target: { kind: 'article', id: 'pol-a1' } }).success).toBe(true);
  expect(
    SPAN.safeParse({ type: 'link', text: 'x', target: { kind: 'external', url: 'https://example.org/a' } }).success,
  ).toBe(true);
  expect(SPAN.safeParse({ type: 'link', text: 'x', target: { kind: 'external', url: 'not-a-url' } }).success).toBe(
    false,
  );
});

test('BLOCK parses each block kind and rejects an unknown one', () => {
  const block: Block = BLOCK.parse({ type: 'paragraph', spans: [{ type: 'text', value: 'x' }] });
  expectTypeOf(block).toEqualTypeOf<Block>();
  expect(BLOCK.safeParse({ type: 'heading', text: 'Titre' }).success).toBe(true);
  expect(BLOCK.safeParse({ type: 'quote', spans: [{ type: 'text', value: 'x' }], source: 'Une source' }).success).toBe(
    true,
  );
  expect(BLOCK.safeParse({ type: 'image', caption: 'c', key: 'pol-a1-hero' }).success).toBe(true);
  expect(BLOCK.safeParse({ type: 'video', title: 'T', durationSeconds: 192 }).success).toBe(true);
  expect(BLOCK.safeParse({ type: 'video', title: 'T', durationSeconds: '3:12' }).success).toBe(false);
  // A related block carries the summary of what it points at, and an id alone is no longer enough to draw its card.
  const pointed = {
    id: 'pol-a2',
    format: 'article',
    access: 'free',
    title: 'Un titre',
    standfirst: 'Un chapô.',
    publishedAt: '2026-09-10T08:30:00.000Z',
  };
  expect(BLOCK.safeParse({ type: 'related', summary: pointed }).success).toBe(true);
  expect(BLOCK.safeParse({ type: 'related', id: 'pol-a2' }).success).toBe(false);
  expect(BLOCK.safeParse({ type: 'callout', title: 'T', text: 'x', button: 'Voir' }).success).toBe(true);
  expect(BLOCK.safeParse({ type: 'sidebar' }).success).toBe(false);
});

test('SECTION reads a slug and the name the newsroom prints, and nothing else', () => {
  const section: Section = SECTION.parse({ id: 'culture-et-savoir', label: 'Culture et savoir', order: 5 });
  expectTypeOf(section).toEqualTypeOf<Section>();
  expect(section).toEqual({ id: 'culture-et-savoir', label: 'Culture et savoir' });
  expect(SECTION.safeParse({ id: '19569', label: 'Culture et savoir' }).success).toBe(false);
});
