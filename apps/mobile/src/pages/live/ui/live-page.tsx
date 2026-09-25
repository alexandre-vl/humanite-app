import type { SectionId } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import type { LabelBarItem } from '#components/label-bar';
import { LabelBar } from '#components/label-bar';
import { ArticleWire, sectionFeedQuery, useArticleStream, usePagedFeed, useSections } from '#entities/article';
import { t } from '#i18n';
import { articleHref } from '#lib/routing';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Scroll } from '#primitives/scroll';
import { Surface } from '#primitives/surface';

/** What the band reports when the reader is filtering nothing out, which is no section and has none. */
const WHOLE = 'whole';

/** What the band is showing: the whole paper, or one of its sections. */
type Chosen = typeof WHOLE | SectionId;

const useStyles = createStyles((theme) => ({
  // The band takes no height of its own: what it measures is what its names measure, which is what has to grow when
  // the reader asks for larger type.
  band: { flexGrow: 0, flexShrink: 0, backgroundColor: theme.surface },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.md, paddingHorizontal: SPACING.lg },
}));

type WholeProps = Readonly<{ sections: readonly SectionId[]; onOpen: (href: ReturnType<typeof articleHref>) => void }>;

/**
 * The whole paper in the order the newsroom filed it.
 *
 * It is a component of its own for the reason the filtered run below is: the two read different things, a hook may
 * not be called on a condition, and the reader turning the filter should arrive at the top of what they asked for
 * rather than at the offset they had left the other one on.
 */
function Whole({ sections, onOpen }: WholeProps): ReactNode {
  const feed = useArticleStream(sections);
  return (
    <ArticleWire
      feed={feed}
      onOpen={(id) => {
        onOpen(articleHref(id));
      }}
    />
  );
}

type OnlyProps = Readonly<{ section: SectionId; onOpen: (href: ReturnType<typeof articleHref>) => void }>;

/** One section in the same order, read through its own list, which pages back months on its own. */
function Only({ section, onOpen }: OnlyProps): ReactNode {
  const feed = usePagedFeed(sectionFeedQuery(section));
  return (
    <ArticleWire
      feed={feed}
      onOpen={(id) => {
        onOpen(articleHref(id));
      }}
    />
  );
}

/**
 * The En continu screen: the whole paper in the order the newsroom filed it, under the head of each day, with a band
 * across the top narrowing it to one section.
 *
 * It used to read the wire's own route and nothing else, and that route is two and a half hours long: it answers ten
 * items and pages no further — asked for a second page on 25/09/2026 it served the same ten, and asked for a larger
 * one it served ten. A reader who reached the foot of this screen had reached the foot of the paper at half past ten
 * in the morning. What pages is every section's own list, thirty at a time and months deep, so the screen reads all
 * eleven of them together and merges them: 102 articles over three days on the first reading, 214 over five on the
 * second, against ten over one morning.
 *
 * Each article stands once. The journal's own app prints the newest ten, then five under each section's name, and
 * shows the same article in both — nine of ten, counted on 25/09/2026. On a screen that claims to be a running order,
 * a piece printed twice is a piece filed at two different times.
 *
 * The band is a filter and not a way out. The front page carries one that turns its pages, and the argument against
 * a second copy of it here still holds: a wire read by the minute is the last place to spend a row on somewhere else.
 * This one spends the row on something the reader cannot get anywhere else — the same running order, narrowed. It
 * leads nowhere, so nothing on it is a door, and pressing a name never takes the screen away from under the reader.
 *
 * It carries no title band. The tab bar names the screen, and the list pins the head of each day at the very top of
 * its frame — which is exactly where a band would sit.
 *
 * It is printed on the paper's own page. It used to be printed on the paper's red, edge to edge, every word on it in
 * white — which is how the screen it copies does it, and which cost three things. White on that red measures 3.83 to
 * one: the app's one knowing departure from the contrast it otherwise holds to, and it was being spent not on a mark
 * but on a screenful of running text, at the size running text is set in. A red that covers everything can mark
 * nothing, so the day the run belongs to, the item the newsroom picked out and the item one has already read all had
 * to be said some other way, and none of them was. And every picture the corpus draws was being laid on a ground it
 * was never drawn for. The red is still here, on the band that heads each day, which is the one thing on a list
 * ordered by time that is worth marking.
 */
export function LivePage(): ReactNode {
  const styles = useStyles();
  const sections = useSections();
  const [chosen, setChosen] = useState<Chosen>(WHOLE);
  const names: readonly LabelBarItem<Chosen>[] = useMemo(
    () => [
      { id: WHOLE, label: t('live.whole') },
      ...sections.map((section) => ({ id: section.id, label: section.label })),
    ],
    [sections],
  );
  const ids = useMemo(() => sections.map((section) => section.id), [sections]);
  const open = (href: ReturnType<typeof articleHref>): void => {
    router.push(href);
  };
  return (
    <Surface>
      <Box style={styles.band}>
        <Scroll axis="horizontal" contentStyle={styles.row}>
          <LabelBar items={names} active={chosen} onSelect={setChosen} />
        </Scroll>
      </Box>
      {chosen === WHOLE ? <Whole sections={ids} onOpen={open} /> : <Only section={chosen} onOpen={open} />}
    </Surface>
  );
}
