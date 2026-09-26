import type { DisplayText, SectionId } from '@huma/contracts';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import type { LabelBarItem } from '#components/label-bar';
import { LabelBar } from '#components/label-bar';
import { TopBar, TopBarButton } from '#components/top-bar';
import {
  ArticleFeed,
  feedQuery,
  sectionFeedQuery,
  useArticleStream,
  usePagedFeed,
  useSections,
} from '#entities/article';
import { BookmarkToggle } from '#features/bookmark';
import { UnseenNotice, useUnseen } from '#features/last-visit';
import { t } from '#i18n';
import { articleHref, LIVE_HREF, SETTINGS_HREF } from '#lib/routing';
import { createStyles } from '#lib/styles';
import { Pager } from '#primitives/pager';
import type { NamePlace } from '#primitives/pager';
import { Surface } from '#primitives/surface';

/** The identifier the band reports for the front page itself, which is no section and has none. */
const FRONT = 'front';

/** Which page of the paper a leaf is: the front, or a section by its own id. */
type LeafId = typeof FRONT | SectionId;

/** One page of the paper: the whole of it, or one section of it. */
type Leaf = Readonly<{ id: LeafId; label: DisplayText }>;

// The band lies on the page's own ground. It was painted as a surface raised over the page, which the light theme gives
// the page's white and the dark one a lighter grey: on the iPhone simulator on 25/09/2026, a bar of #1e1e1e ran under
// the paper's name across a page of #141414, as if it were not part of the page it names.
const useStyles = createStyles((theme) => ({ band: { backgroundColor: theme.background } }));

type SheetProps = Readonly<{
  leaf: Leaf;
  /** What the page sets above its first card: the wire's news, on the front alone. */
  notice?: ReactNode;
}>;

/**
 * One page's feed: the whole paper, or one section of it.
 *
 * A page is a component of its own because each asks for its own feed, and a hook cannot be called in a loop over a
 * list whose length arrives from the newsroom.
 */
function Sheet({ leaf, notice }: SheetProps): ReactNode {
  const feed = usePagedFeed(leaf.id === FRONT ? feedQuery : sectionFeedQuery(leaf.id));
  return (
    <ArticleFeed
      feed={feed}
      rhythm="paper"
      onOpen={(id) => {
        router.push(articleHref(id));
      }}
      action={(summary) => <BookmarkToggle summary={summary} />}
      notice={notice}
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
 *
 * The wire is a tab too, and the front opens on a door to it all the same — only while the wire holds what it has not
 * shown the reader, and saying how much. That is what the door is for: the tab says where the wire is, and not that
 * twelve articles came out there since the reader last looked. Once they have looked, it goes.
 */
export function HomePage(): ReactNode {
  const styles = useStyles();
  const sections = useSections();
  // The wire's own run, under the key the wire reads it by: one reading for both screens, and what it holds that the
  // wire has not shown the reader is said on the front, which is where a reader opens the paper.
  const ids = useMemo(() => sections.map((section) => section.id), [sections]);
  const unseen = useUnseen(useArticleStream(ids).items);
  const [at, setAt] = useState(0);
  // Held between renders because the band measures its labels: handed a new row of items, it takes every label's
  // frame again, and a row rebuilt on every render would have it measuring for ever.
  const leaves: readonly Leaf[] = useMemo(
    () => [
      { id: FRONT, label: t('nav.headline') },
      ...sections.map((section) => ({ id: section.id, label: section.label })),
    ],
    [sections],
  );
  const items: readonly LabelBarItem<LeafId>[] = leaves;
  const shown = Math.min(at, leaves.length - 1);
  // Where the names came to rest. The band travels a rule under the one in force and brings the one ahead into view,
  // and it can do neither without them; the row that draws the names is the only thing that can measure them. They
  // meet here because the band belongs to the pager and the names do not.
  const [places, setPlaces] = useState<readonly NamePlace[]>([]);
  return (
    <Surface>
      <TopBar
        title={t('app.name')}
        names="paper"
        action={
          <TopBarButton
            icon="reading"
            label={t('settings.title')}
            onPress={() => {
              router.push(SETTINGS_HREF);
            }}
          />
        }
      />
      <Pager
        count={leaves.length}
        active={shown}
        onActive={setAt}
        places={places}
        namesStyle={styles.band}
        names={
          <LabelBar
            items={items}
            active={leaves[shown]?.id}
            onPlaces={setPlaces}
            onSelect={(id) => {
              const chosen = leaves.findIndex((leaf) => leaf.id === id);
              if (chosen >= 0) {
                setAt(chosen);
              }
            }}
          />
        }
        renderPage={(index) => {
          const leaf = leaves[index];
          return leaf === undefined ? null : (
            <Sheet
              leaf={leaf}
              notice={
                leaf.id !== FRONT || unseen === null ? undefined : (
                  <UnseenNotice
                    unseen={unseen}
                    onPress={() => {
                      router.navigate(LIVE_HREF);
                    }}
                  />
                )
              }
            />
          );
        }}
      />
    </Surface>
  );
}
