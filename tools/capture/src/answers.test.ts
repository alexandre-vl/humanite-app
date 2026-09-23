import { DONATION, SECTIONS_KEY } from '@huma/contracts';
import { isList, isRecord } from '@huma/unknown';
import { expect, test } from 'vitest';
import { chooseAnswers, moduleOf } from './answers.ts';
import type { Exchange } from './har.ts';

/** An exchange of the service, as the reading of a capture hands it over: only what the choosing reads is varied. */
const exchange = (path: string, query: string, answer: unknown, status = 200): Exchange => ({
  at: '2026-09-21T20:55:00.000Z',
  method: 'GET',
  url: `https://phenix2.immanens.com${path}${query}`,
  host: 'phenix2.immanens.com',
  path,
  query,
  status,
  mime: 'application/json',
  requestBody: null,
  responseBody: JSON.stringify(answer),
});

/** An item of a list, of a format and a reservation of its own. */
const post = (id: string, format: string, premium: boolean) => ({
  id,
  article_format: format,
  premium,
  image_caption: null,
  author: 'La rédaction',
  excerpt: '',
});

const ROOT = '/api/v1/app/300';

const CAPTURE: readonly Exchange[] = [
  exchange(`${ROOT}/wordpress/19573/posts`, '?page=1&language=fr&ano=1', '<html>Redirecting</html>', 301),
  exchange(`${ROOT}/wordpress/home`, '?&language=fr&ano=1', {
    posts: [
      post('1', 'classic', true),
      post('2', 'classic', true),
      post('3', 'classic', false),
      post('4', 'opinion', true),
    ],
  }),
  exchange(`${ROOT}/wordpress/home`, '?&language=fr&ano=1', { posts: [post('9', 'video', true)] }),
  exchange(`${ROOT}/wordpress/menu`, '?language=fr&ano=1', { [SECTIONS_KEY]: [{ id: 19565 }, { id: 19566 }] }),
  exchange(`${ROOT}/wordpress/post/3860965`, '?type=post&output_format=array&language=fr', {
    article_format: 'opinion',
    content_array: [`<p>${'Un paragraphe. '.repeat(1000)}</p>${DONATION}>${'x'.repeat(2000)}</div>`],
  }),
  exchange('/wp-content/uploads/2026/09/x.jpg', '?w=1200', {}),
];

test('each list route keeps the first answer it was given, with the request that asked it, under the service’s root', () => {
  const { answers } = chooseAnswers(CAPTURE);
  expect(answers.front?.path).toBe('/wordpress/home');
  expect(answers.front?.query).toBe('?&language=fr&ano=1');
  expect(answers.menu?.path).toBe('/wordpress/menu');
});

/** A list is kept for its shapes: one item per format and reservation, a free item never lost behind reserved ones. */
test('a list keeps one item per shape, a free one among them, in the order the service sent them', () => {
  const posts = chooseAnswers(CAPTURE).answers.front?.answer['posts'];
  const ids = isList(posts) ? posts.map((each) => (isRecord(each) ? each['id'] : null)) : null;
  expect(ids).toEqual(['1', '3', '4']);
});

test('the menu is kept whole: its sections are its shape', () => {
  const sections = chooseAnswers(CAPTURE).answers.menu?.answer[SECTIONS_KEY];
  expect(isList(sections) ? sections.length : 0).toBe(2);
});

/** A body is kept long enough to read a structure and never whole, and the donation block that closes it by its head. */
test('an article is kept per format, its prose cut short and its donation block cut to its head', () => {
  const kept = chooseAnswers(CAPTURE).articles['opinion'];
  const parts: unknown = kept?.answer['content_array'];
  const body = isList(parts) ? parts[0] : undefined;
  expect(kept?.path).toBe('/wordpress/post/3860965');
  expect(typeof body === 'string' ? body.length : 0).toBeLessThan(9000);
  expect(typeof body === 'string' ? body : '').toContain(DONATION);
  expect(typeof body === 'string' ? body : '').not.toContain('x'.repeat(500));
});

test('what did not go through, or is not the service’s, is not kept, and what the capture lacks is named', () => {
  const chosen = chooseAnswers(CAPTURE);
  expect(chosen.answers.section).toBeUndefined();
  expect(chosen.missing).toEqual(['wire', 'section', 'search']);
});

test('the module a reading writes names the service’s key for its sections through the contracts’ constant', () => {
  const written = moduleOf(chooseAnswers(CAPTURE));
  expect(written).toContain("import { SECTIONS_KEY } from '@huma/contracts';");
  expect(written).toContain('[SECTIONS_KEY]:');
  expect(written).not.toContain('"rubriques"');
});
