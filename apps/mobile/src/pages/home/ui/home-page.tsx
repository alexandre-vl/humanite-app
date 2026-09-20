import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { LabelBarItem } from '#components/label-bar';
import { LabelBar } from '#components/label-bar';
import { ArticleFeed, feedQuery, useKeptFeed, usePagedFeed } from '#entities/article';
import { SectionBar } from '#entities/section';
import { BookmarkToggle, useBookmarks } from '#features/bookmark';
import { t } from '#i18n';
import { articleHref, sectionHref } from '#lib/routing';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Surface } from '#primitives/surface';
import { Text } from '#primitives/text';

/** What the screen is showing: the paper, or the articles the reader kept from it. */
type Showing = 'headline' | 'bookmarks';

const SHOWING: readonly LabelBarItem<Showing>[] = [
  { id: 'headline', label: t('nav.headline') },
  { id: 'bookmarks', label: t('bookmark.tab') },
];

const useStyles = createStyles((theme) => ({
  masthead: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.border },
  // The band fills the rows the list reserved for it, and its bars share them. Without a height of its own it would
  // size to its content, and its bars — which stretch to the band rather than measure themselves — would find nothing
  // to stretch to and collapse: an empty strip over a gap the list had already left for it.
  bands: { flex: 1 },
}));

/**
 * The À la une screen: every section at once, under a masthead that collapses behind the bands as the feed scrolls.
 * No section is named here, so the band shows none as the one being read; choosing one opens its own screen.
 *
 * The masthead carries the paper's name and nothing else. It held a magnifier for a while, drawn but answering to
 * nothing; searching is now a destination of its own, and a second way in that scrolls away with the masthead would
 * be a worse one.
 *
 * What the reader kept is shown here rather than on a destination of its own: the tab bar is at five of the six
 * Android allows, and what one keeps of a paper is a way of reading it, not a sixth place to go. The band naming the
 * two takes the top row and stays; the sections take the row under it, and step aside on the kept articles, which
 * belong to no section in particular — which is also what the screen this copies does.
 */
export function HomePage(): ReactNode {
  const styles = useStyles();
  const [showing, setShowing] = useState<Showing>('headline');
  const paper = usePagedFeed(feedQuery);
  const kept = useKeptFeed(useBookmarks((state) => state.ids));
  const onBookmarks = showing === 'bookmarks';
  return (
    <Surface>
      <ArticleFeed
        feed={onBookmarks ? kept : paper}
        rhythm={onBookmarks ? 'list' : 'paper'}
        onOpen={(id) => {
          router.push(articleHref(id));
        }}
        action={(summary) => <BookmarkToggle id={summary.id} />}
        header={
          <Box style={styles.masthead}>
            <Text variant="display">{t('app.name')}</Text>
          </Box>
        }
        sticky={
          <Box style={styles.bands}>
            <LabelBar items={SHOWING} active={showing} onSelect={setShowing} />
            {onBookmarks ? null : (
              <SectionBar
                onSelect={(section) => {
                  router.push(sectionHref(section));
                }}
              />
            )}
          </Box>
        }
        stickyRows={onBookmarks ? 1 : 2}
        empty={onBookmarks ? { title: t('bookmark.empty.title'), message: t('bookmark.empty.message') } : undefined}
      />
    </Surface>
  );
}
