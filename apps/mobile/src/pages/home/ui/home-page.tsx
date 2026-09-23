import type { DisplayText, SectionId } from '@huma/contracts';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { LabelBarItem } from '#components/label-bar';
import { LabelBar } from '#components/label-bar';
import { TopBar, TopBarButton } from '#components/top-bar';
import { ArticleFeed, feedQuery, sectionFeedQuery, usePagedFeed } from '#entities/article';
import { BookmarkToggle } from '#features/bookmark';
import { t } from '#i18n';
import { articleHref, SETTINGS_HREF } from '#lib/routing';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Pager } from '#primitives/pager';
import { Surface } from '#primitives/surface';
import { useSections } from '../model/sections';

/** The identifier the band reports for the front page itself, which is no section and has none. */
const FRONT = 'front';

/** One page of the paper: the whole of it, or one section of it. */
type Leaf = Readonly<{ id: string; label: DisplayText; section: SectionId | null }>;

const useStyles = createStyles(() => ({ page: { flex: 1 } }));

type SheetProps = Readonly<{ leaf: Leaf }>;

/**
 * One page's feed: the whole paper, or one section of it.
 *
 * A page is a component of its own because each asks for its own feed, and a hook cannot be called in a loop over a
 * list whose length arrives from the newsroom.
 */
function Sheet({ leaf }: SheetProps): ReactNode {
  const section = leaf.section;
  const feed = usePagedFeed(section === null ? feedQuery : sectionFeedQuery(section));
  return (
    <ArticleFeed
      feed={feed}
      rhythm="paper"
      onOpen={(id) => {
        router.push(articleHref(id));
      }}
      action={(summary) => <BookmarkToggle summary={summary} />}
    />
  );
}

/**
 * The front screen: the paper's own name, the band of its sections, and the paper itself — read by turning its
 * sections under the finger rather than by opening one and coming back out of it.
 *
 * The sections are pages of the front screen and not screens pushed over it: reading two of them that way would take a
 * press, a read, a press back and a press, and the band — the one thing that says what else there is to read — would
 * be the only part of the paper a reader could not reach by reading. The band names the page in hand, and either a
 * press or a swipe turns to another.
 *
 * The masthead is a bar and not a block that slides away. A masthead shared by every page, each scrolled to its own
 * place, would be somewhere different from the page under it the moment a reader swiped.
 *
 * It carries one control. What the reader keeps is a tab, and a mark for it on this bar would be a second door to the
 * destination standing directly under it.
 */
export function HomePage(): ReactNode {
  const styles = useStyles();
  const sections = useSections();
  const [at, setAt] = useState(0);
  const leaves: readonly Leaf[] = [
    { id: FRONT, label: t('nav.headline'), section: null },
    ...sections.map((section) => ({ id: section.id, label: section.label, section: section.id })),
  ];
  const items: readonly LabelBarItem<string>[] = leaves;
  const shown = Math.min(at, leaves.length - 1);
  return (
    <Surface>
      <TopBar
        title={t('app.name')}
        names="paper"
        actions={
          <TopBarButton
            icon="reading"
            label={t('settings.title')}
            onPress={() => {
              router.push(SETTINGS_HREF);
            }}
          />
        }
      />
      <LabelBar
        items={items}
        active={leaves[shown]?.id}
        onSelect={(id) => {
          const chosen = leaves.findIndex((leaf) => leaf.id === id);
          if (chosen >= 0) {
            setAt(chosen);
          }
        }}
      />
      <Box style={styles.page}>
        <Pager
          count={leaves.length}
          active={shown}
          onActive={setAt}
          renderPage={(index) => {
            const leaf = leaves[index];
            return leaf === undefined ? null : <Sheet leaf={leaf} />;
          }}
        />
      </Box>
    </Surface>
  );
}
