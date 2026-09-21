import type { Access, ArticleSummary, DisplayText } from '@huma/contracts';
import { RADII, SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { pictureOf } from '#api';
import { Badge } from '#components/badge';
import { t } from '#i18n';
import { DECORATIVE } from '#lib/announce';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Image } from '#primitives/image';
import { Text } from '#primitives/text';

import { HERO_RATIO } from '../model/picture';
import type { CardShape } from '../model/rhythm';

export type ArticleCardProps = Readonly<{
  shape: CardShape;
  summary: ArticleSummary;
  action?: ReactNode | undefined;
  signature?: DisplayText | null | undefined;
  /** What the article belongs to, named over its title. A screen that is already one section names none. */
  name?: DisplayText | null | undefined;
}>;

/**
 * Whether a card tells the reader the item is reserved, access by access. The table answers for every access the
 * contract declares, so an access added there stops the build here rather than travelling the feed unmarked — a
 * silence nothing would report.
 */
const MARKED = { free: false, premium: true } satisfies Readonly<Record<Access, boolean>>;

/** The square the small picture of a card in a line is cropped to. */
const THUMBNAIL_RATIO = 1;

const useStyles = createStyles((theme) => ({
  // The parts of a card are set at three distances, and the distances are what group them: what belongs together is
  // nearer than what follows. A single gap between all four — which is what the card had — says they are four
  // unrelated things, and leaves the order they are read in resting on size alone.
  card: { gap: SPACING.sm },
  title: { gap: SPACING.xs },
  // The gap between the picture and what follows is the card's, and never the picture's own margin. Given one, the
  // picture lost thirty-seven pixels of width on an A065: a cell of a virtualised list is laid out at a height it
  // already knows, so a margin added under the picture comes off the picture's height — and a box held to a ratio
  // that loses height loses width with it. Measured [42,399][1001,938] against [42,399][1038,958] beside it.
  picture: { alignSelf: 'stretch', aspectRatio: HERO_RATIO, borderRadius: RADII.sm, backgroundColor: theme.border },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  thumbnail: {
    width: SIZES.thumbnail,
    aspectRatio: THUMBNAIL_RATIO,
    borderRadius: RADII.sm,
    backgroundColor: theme.border,
  },
  rest: { flex: 1 },
  // A column is marked by the rule the app already marks a quoted voice with, and not by a filled block of the
  // paper's red. Of the three systems that mark an opinion piece on a front, none paints one: the Guardian tints a
  // kicker word and a quote glyph and leaves the card transparent, Le Monde names the genre and the writer's standing
  // and drops the picture. A block of brand colour in a scrolling feed is a thing to look at, not a thing to read.
  column: { flexDirection: 'row', gap: SPACING.md },
  mark: { width: SIZES.stroke, alignSelf: 'stretch', backgroundColor: theme.primary },
  // What the card says about itself, and the one thing a reader may do to it from the feed. It used to close the
  // card, under the standfirst, carrying the date of publication; the date is gone — the front page of a week's
  // paper needs none, which is Nielsen's guideline 84 — and what is left belongs over the title, where a paper prints
  // a surtitre, rather than in a row of its own at the bottom.
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  said: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
}));

type MetaProps = Readonly<{ summary: ArticleSummary; action: ReactNode; said: ReactNode }>;

/**
 * The line over a card's title: what it belongs to, whether it is reserved, and what the screen lets a reader do.
 *
 * It is drawn on every shape and always in the same place, so the control a reader reaches for is where they left it
 * whatever the card under it looks like. NN/g's finding on saving is what keeps it visible rather than behind a
 * press-and-hold: a save nobody can find is a save nobody uses. It stays the one thing on the card that answers a
 * press of its own, which is the other half of the same finding.
 */
function Meta({ summary, action, said }: MetaProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.meta}>
      <Box style={styles.said}>
        {said}
        {MARKED[summary.access] ? <Badge label={t('article.premium')} /> : null}
      </Box>
      {action}
    </Box>
  );
}

/**
 * The section a card belongs to, set over its title in small capitals.
 *
 * Without it a front page is a column of headlines with nothing to say which part of the paper each came from — the
 * one thing a reader sorting twenty cards actually uses. It is drawn only where the screen supplies a name: inside a
 * section, every card would carry the same word and say nothing.
 */
function Kicker({ name }: Readonly<{ name: DisplayText | null }>): ReactNode {
  if (name === null) {
    return null;
  }
  return <Text variant="kicker">{name}</Text>;
}

type BodyProps = Readonly<{
  summary: ArticleSummary;
  action: ReactNode;
  signature: DisplayText | null;
  name: DisplayText | null;
}>;

/** The front of a page: the picture first, at the width of the block, then the words under it. */
function Lead({ summary, action, name }: BodyProps): ReactNode {
  const styles = useStyles();
  const visual = pictureOf(summary, 'card');
  return (
    <Box style={styles.card}>
      {visual === null ? null : (
        <Image
          source={visual.source}
          recyclingKey={summary.id}
          announces={DECORATIVE}
          thumbhash={visual.thumbhash}
          style={styles.picture}
        />
      )}
      <Meta summary={summary} action={action} said={<Kicker name={name} />} />
      <Box style={styles.title}>
        <Text variant="title" numberOfLines={3}>
          {summary.title}
        </Text>
        <Text variant="summary" numberOfLines={2}>
          {summary.standfirst}
        </Text>
      </Box>
    </Box>
  );
}

/**
 * A card in a line: the title down the left of the block and a small picture beside it.
 *
 * The title used to run the full width of the card and the picture sat under it, beside the standfirst — so the title
 * was cut at two lines while the room next to the picture went to a sentence, and the card had two left margins, one
 * for the title and one for everything under it. NN/g's rule for a list row is the one this broke: a reader scans a
 * single left edge, so the text keeps one column and the picture takes the other. It takes the right-hand one because
 * not every item in this feed has a picture — a brief and a column have none — and a picture on the right leaves every
 * title in the feed flush against the same edge whether or not one is there.
 *
 * It carries no standfirst. On a phone the Guardian shows none on any card and the BBC shows none on any card; Le
 * Monde shows one on fifteen of a hundred and seven. A sentence under every title is what turned this front into a
 * wall of grey where nothing was subordinate to anything.
 */
function Line({ summary, action, name }: BodyProps): ReactNode {
  const styles = useStyles();
  const visual = pictureOf(summary, 'thumbnail');
  return (
    <Box style={styles.card}>
      <Meta summary={summary} action={action} said={<Kicker name={name} />} />
      <Box style={styles.line}>
        <Box style={styles.rest}>
          {/* Four lines and not three. The column left beside a picture of ninety-six points measures twenty-nine
              letters of this face at this size, and the paper's own headlines run to ninety-five: at three lines a
              title of the corpus is cut while the fourth line it needed sits empty under the picture. Four lines of
              twenty points measure ninety-two, which is what the picture beside them measures. */}
          <Text variant="title" numberOfLines={4}>
            {summary.title}
          </Text>
        </Box>
        {visual === null ? null : (
          <Image
            source={visual.source}
            recyclingKey={summary.id}
            announces={DECORATIVE}
            thumbhash={visual.thumbhash}
            style={styles.thumbnail}
          />
        )}
      </Box>
    </Box>
  );
}

/**
 * A column, marked as one and signed.
 *
 * The current app prints the word on a red block beside the writer's portrait, and leaves the other half of the card
 * empty — no standfirst, no date (capture 18). The portrait is not the paper's to print here: the corpus files no
 * likeness of anyone, and inventing one for a writer who does not exist would be a picture of a person. So the mark
 * is the rule the app draws down the side of a quoted voice, the word and the name are set where every other card
 * sets what it belongs to, and the card keeps the standfirst every other shape with room for one keeps.
 */
function Column({ summary, action, signature }: BodyProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.column}>
      <Box style={styles.mark} />
      <Box style={styles.rest}>
        <Box style={styles.card}>
          <Meta
            summary={summary}
            action={action}
            said={
              <>
                <Text variant="kicker" tone="textPrimary">
                  {t('article.column')}
                </Text>
                {signature === null ? null : <Text variant="caption">{signature}</Text>}
              </>
            }
          />
          <Box style={styles.title}>
            <Text variant="title" numberOfLines={3}>
              {summary.title}
            </Text>
            <Text variant="summary" numberOfLines={2}>
              {summary.standfirst}
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/** An item written without a picture: its words are the whole card (capture 02). */
function Brief({ summary, action, name }: BodyProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.card}>
      <Meta summary={summary} action={action} said={<Kicker name={name} />} />
      <Box style={styles.title}>
        <Text variant="title" numberOfLines={3}>
          {summary.title}
        </Text>
        <Text variant="summary" numberOfLines={3}>
          {summary.standfirst}
        </Text>
      </Box>
    </Box>
  );
}

/**
 * One article as a feed announces it, in the shape the feed's rhythm gave it.
 *
 * The shape arrives decided: a card does not read the item to choose one, because the list recycles a cell only
 * between items that answered the same shape, and the only place that can answer for a whole feed at once is the one
 * that laid it out. The four shapes are kept in this one file so that what separates them — how much room the picture
 * takes, and whether there is one — can be read at a glance rather than diffed across four.
 *
 * They are four orderings of one order. Every card says what it belongs to first, then its title, then the sentence
 * under it if it has room for one; what changes is the picture. That is Le Monde's card, which runs a whole front off
 * one component and varies which parts are present rather than where they sit, and it is what the fifth shape broke:
 * `stacked` put the title above the picture and the standfirst below it, so two cards a scroll apart taught two
 * different templates for the same four things.
 *
 * `action` is whatever the screen lets a reader do to the article from the feed, `signature` who signed it, and
 * `name` the section it ran in. The card takes all three already made: an entity may not name a route, hold an
 * action of its own, nor ask another entity for the newsroom's sections from inside a cell that is mounted and
 * thrown away as the reader scrolls.
 */
export function ArticleCard({ shape, summary, action, signature = null, name = null }: ArticleCardProps): ReactNode {
  const body = { summary, action, signature, name };
  switch (shape) {
    case 'lead': {
      return <Lead {...body} />;
    }
    case 'line': {
      return <Line {...body} />;
    }
    case 'column': {
      return <Column {...body} />;
    }
    case 'brief': {
      return <Brief {...body} />;
    }
  }
}
