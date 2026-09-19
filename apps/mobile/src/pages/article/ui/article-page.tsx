import { ARTICLE_ID } from '@huma/contracts';
import { Stack, router } from 'expo-router';
import type { ReactNode } from 'react';
import { ArticleReader } from '#entities/article';
import { articleHref, useRouteParams } from '#lib/routing';
import { Surface } from '#primitives/surface';

/**
 * One article, read whole, full screen.
 *
 * The parameter is parsed rather than read: an `ArticleId` is a branded string only the contract's parser mints, so a
 * link whose value is not shaped like one never reaches the content, and one that is shaped like one but names no
 * article comes back as the failure the reader is offered another try at.
 *
 * The route is pushed at the root of the stack rather than inside the tabs, so reading covers the tab bar — which is
 * what the current app does, and what the reference calls for: `Article — plein écran, retour ‹, sans barre du bas`.
 * The native header stays, carrying the back chevron and no title: an article's own headline is already the first
 * thing under it, and repeating it in a bar would say it twice.
 *
 * Following a link inside the body leads to another article by replacing this screen rather than stacking one more,
 * the way one section replaces another: a reader who followed four links back to back should step back to the feed,
 * not walk every article already read.
 */
export function ArticlePage(): ReactNode {
  const id = useRouteParams((raw) => ARTICLE_ID.parse(raw['id']));
  return (
    <Surface>
      <Stack.Screen options={{ title: '' }} />
      <ArticleReader
        id={id}
        onFollow={(target) => {
          if (target.kind === 'article') {
            router.replace(articleHref(target.id));
          }
        }}
      />
    </Surface>
  );
}
