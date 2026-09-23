import { ARTICLE_ID } from '@huma/contracts';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { TopBar } from '#components/top-bar';
import { ArticleReader, articleQuery, readsDark } from '#entities/article';
import { BookmarkToggle } from '#features/bookmark';
import { articleHref, openExternal, useRouteParams } from '#lib/routing';
import { Surface } from '#primitives/surface';
import { ThemeScope } from '#primitives/theme';

/**
 * One article, read whole, full screen.
 *
 * The parameter is parsed rather than read: an `ArticleId` is a branded string only the contract's parser mints, so a
 * link whose value is not shaped like one never reaches the content, and one that is shaped like one but names no
 * article comes back as the failure the reader is offered another try at.
 *
 * The route is pushed at the root of the stack rather than inside the tabs, so reading covers the tab bar — which is
 * what the current app does, and what the reference calls for: `Article — plein écran, retour ‹, sans barre du bas`.
 * The bar across the top carries the way back and no name: an article's own headline is already the first thing
 * under it, and repeating it in a bar would say it twice.
 *
 * Keeping the article is offered from that same bar, opposite the chevron. The screen this copies puts the mark in
 * the flow of the text, where it scrolls out of reach of a reader who has read down to the end and decided: the two
 * things one does to an article one is reading — leave it, keep it — belong together and stay. The mark appears with
 * the article, which is what it keeps: the reader below asks for it, and this screen reads the same answer.
 *
 * Following a link inside the body leads to another article by replacing this screen rather than stacking one more,
 * the way one section replaces another: a reader who followed four links back to back should step back to the feed,
 * not walk every article already read. A link that points outside the paper leaves the app entirely, and so does the
 * film of a video: both are pages kept on the open web, and the screen is where that is decided — the article knows
 * it is sending a reader somewhere, never where.
 *
 * A video is read on the dark page, from the status bar down, whatever the reader's theme: the ground belongs to what
 * is read, as the current app prints its videos. The whole screen is scoped — its bar and the inset over it included —
 * where only the reading was, which left a white bar over a black page. The scope stands whether or not it names a
 * theme, so the screen is not built again when the article arrives and turns out to be a film.
 */
export function ArticlePage(): ReactNode {
  const id = useRouteParams((raw) => ARTICLE_ID.parse(raw['id']));
  const article = useQuery(articleQuery(id)).data;
  return (
    <ThemeScope name={article !== undefined && readsDark(article.format) ? 'dark' : null} screen>
      <Surface>
        <TopBar
          onBack={() => {
            router.back();
          }}
          action={article === undefined ? null : <BookmarkToggle summary={article} />}
        />
        <ArticleReader
          id={id}
          onFollow={(target) => {
            if (target.kind === 'article') {
              router.replace(articleHref(target.id));
              return;
            }
            openExternal(target.url);
          }}
        />
      </Surface>
    </ThemeScope>
  );
}
