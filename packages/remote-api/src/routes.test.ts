import { FILED_ID } from '@huma/contracts';
import { expect, test } from 'vitest';
import { RECORDED } from './recorded.ts';
import { addressOf, ROUTES, routeOf } from './routes.ts';

test('a list of a reader nobody signed in asks in French, and says no one did', () => {
  expect(addressOf(ROUTES.front.request())).toBe(
    'https://phenix2.immanens.com/api/v1/app/300/wordpress/home?language=fr&ano=1',
  );
});

/** Without its slash the service answers a redirect, served as JSON and holding HTML: the list is asked where it is. */
test('a section’s own list is asked at its slashed path, page by page', () => {
  expect(addressOf(ROUTES.section.request('19565', 2))).toBe(
    'https://phenix2.immanens.com/api/v1/app/300/wordpress/19565/posts/?page=2&language=fr&ano=1',
  );
});

test('a question travels in the path as itself, spaces and accents encoded', () => {
  expect(ROUTES.search.request('écologie sociale', 1).path).toBe('/article/search/%C3%A9cologie%20sociale');
});

test('an article is asked by the number the journal filed it under', () => {
  expect(ROUTES.article.request(FILED_ID.parse('3860965')).path).toBe('/wordpress/post/3860965');
});

/** The capture sorts its answers through the same table: each answer it kept is filed under the route it answers. */
test('every recorded answer is answered by the route it is filed under', () => {
  expect(routeOf(RECORDED.front.path)).toBe('front');
  expect(routeOf(RECORDED.wire.path)).toBe('wire');
  expect(routeOf(RECORDED.menu.path)).toBe('menu');
  expect(routeOf(RECORDED.section.path)).toBe('section');
  expect(routeOf(RECORDED.search.path)).toBe('search');
  for (const kept of Object.values(RECORDED.articles)) {
    expect(routeOf(kept.path)).toBe('article');
  }
  expect(routeOf('/wordpress/19565/posts')).toBeUndefined();
});
