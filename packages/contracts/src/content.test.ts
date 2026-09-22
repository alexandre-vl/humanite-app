import { expect, expectTypeOf, test } from 'vitest';
import { BLOCK, SECTION, SPAN } from './index.ts';
import type { Block, Section, Span } from './index.ts';

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
  expect(BLOCK.safeParse({ type: 'related', id: 'pol-a2' }).success).toBe(true);
  expect(BLOCK.safeParse({ type: 'callout', title: 'T', text: 'x', button: 'Voir' }).success).toBe(true);
  expect(BLOCK.safeParse({ type: 'sidebar' }).success).toBe(false);
});

test('SECTION requires a three-letter code', () => {
  const section: Section = SECTION.parse({ id: 'monde', code: 'mon', label: 'Monde', order: 4 });
  expectTypeOf(section).toEqualTypeOf<Section>();
  expect(SECTION.safeParse({ id: 'monde', code: 'monde', label: 'Monde', order: 4 }).success).toBe(false);
});
