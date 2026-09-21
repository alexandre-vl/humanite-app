import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { TopBar } from '#components/top-bar';
import { ArticleFeed, useKeptFeed } from '#entities/article';
import { useSectionNames } from '#entities/section';
import { BookmarkToggle, useBookmarks } from '#features/bookmark';
import { t } from '#i18n';
import { articleHref } from '#lib/routing';
import { Surface } from '#primitives/surface';

/**
 * What the reader kept of the paper, on a screen of its own.
 *
 * It lived on the front page for a while, as the second choice of a band above the sections — which is where the app
 * this one follows puts it, and where nothing else does. What one has already decided to read is not a way of reading
 * today's paper; it is a shelf, and a shelf on the front page costs the front page a row and every reader a choice
 * they did not ask to make. It is reached from the mark in the masthead, and from the account.
 *
 * The cards name the section they ran in, as they do everywhere articles from the whole paper are mixed: a shelf is
 * the one place where what was kept comes from anywhere at all.
 */
export function BookmarksPage(): ReactNode {
  const nameOf = useSectionNames();
  const kept = useKeptFeed(useBookmarks((state) => state.ids));
  return (
    <Surface>
      <TopBar
        title={t('bookmark.title')}
        onBack={() => {
          router.back();
        }}
      />
      <ArticleFeed
        feed={kept}
        rhythm="list"
        onOpen={(id) => {
          router.push(articleHref(id));
        }}
        action={(summary) => <BookmarkToggle id={summary.id} />}
        name={(summary) => nameOf(summary.section)}
        empty={{ title: t('bookmark.empty.title'), message: t('bookmark.empty.message') }}
      />
    </Surface>
  );
}
