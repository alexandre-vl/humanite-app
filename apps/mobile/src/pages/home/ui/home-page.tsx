import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { TopBar, TopBarButton } from '#components/top-bar';
import { ArticleFeed, feedQuery, usePagedFeed } from '#entities/article';
import { SectionBar, useSectionNames } from '#entities/section';
import { BookmarkToggle } from '#features/bookmark';
import { t } from '#i18n';
import { articleHref, BOOKMARKS_HREF, sectionHref, SETTINGS_HREF } from '#lib/routing';
import { Surface } from '#primitives/surface';

/**
 * The À la une screen: every section at once, under the paper's own name and the band that names the sections.
 *
 * The masthead is a bar and no longer a block that slides away as the feed scrolls. It carries what a reader wants
 * from anywhere in the paper and could reach from nowhere: what they kept, and how the paper is set for them. A
 * masthead that scrolled off took those with it, and gave back sixty-four points of a screen that has two thousand.
 *
 * What the reader kept has a screen of its own now. It was the second choice of a band above the sections — the shape
 * the app this one follows uses, and the one none of the papers worth copying does: a front page is today's paper,
 * and a shelf of what one has already chosen is not a way of reading it. The band that named the two is gone with it,
 * and the sections have the row it was taking.
 */
export function HomePage(): ReactNode {
  const nameOf = useSectionNames();
  const paper = usePagedFeed(feedQuery);
  return (
    <Surface>
      <TopBar
        title={t('app.name')}
        names="paper"
        actions={
          <>
            <TopBarButton
              icon="bookmark"
              label={t('bookmark.title')}
              onPress={() => {
                router.push(BOOKMARKS_HREF);
              }}
            />
            <TopBarButton
              icon="reading"
              label={t('settings.title')}
              onPress={() => {
                router.push(SETTINGS_HREF);
              }}
            />
          </>
        }
      />
      <ArticleFeed
        feed={paper}
        rhythm="paper"
        onOpen={(id) => {
          router.push(articleHref(id));
        }}
        action={(summary) => <BookmarkToggle id={summary.id} />}
        name={(summary) => nameOf(summary.section)}
        sticky={
          <SectionBar
            onSelect={(section) => {
              router.push(sectionHref(section));
            }}
          />
        }
      />
    </Surface>
  );
}
