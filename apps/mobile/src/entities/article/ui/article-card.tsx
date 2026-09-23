import type { Access, ArticleSummary, DisplayText } from '@huma/contracts';
import { RADII, SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { pictureOf } from '#api';
import { t } from '#i18n';
import { DECORATIVE } from '#lib/announce';
import { formatWhen, useToday } from '#lib/format';
import { createStyles, useTheme } from '#lib/styles';
import { Box } from '#primitives/box';
import { Icon } from '#primitives/icon';
import { Image } from '#primitives/image';
import { Text } from '#primitives/text';

import { formatWord, frameOf } from '../model/format';
import { FRAMES } from '../model/picture';
import type { CardShape } from '../model/rhythm';

export type ArticleCardProps = Readonly<{
  shape: CardShape;
  summary: ArticleSummary;
  action?: ReactNode | undefined;
  signature?: DisplayText | null | undefined;
}>;

/**
 * Whether a card says the item is open to any reader, access by access.
 *
 * Four items in five are reserved to subscribers — twelve of the thirteen on a front page — so a mark on each of those
 * was a mark on four cards in five, and told a reader nothing a card without it did not. The mark goes on the
 * exception: the item anyone can read, which is what Mediapart marks on a paper as closed as this one. The table
 * answers for every access the contract declares, so an access added there stops the build here rather than
 * travelling the feed unmarked.
 */
const OPEN = { free: true, premium: false } satisfies Readonly<Record<Access, boolean>>;

/** The square the small picture of a card in a line is cut to. */
const THUMBNAIL_RATIO = 1;

const useStyles = createStyles((theme) => ({
  // The parts of a card are set at three distances, and the distances are what group them: what belongs together is
  // nearer than what follows. A single gap between all four — which is what the card had — says they are four
  // unrelated things, and leaves the order they are read in resting on size alone.
  card: { gap: SPACING.sm },
  words: { gap: SPACING.xs },
  // The gap between the picture and what follows is the card's, and never the picture's own margin. Given one, the
  // picture lost thirty-seven pixels of width on an A065: a cell of a virtualised list is laid out at a height it
  // already knows, so a margin added under the picture comes off the picture's height — and a box held to a ratio
  // that loses height loses width with it. Measured [42,399][1001,938] against [42,399][1038,958] beside it.
  photo: {
    alignSelf: 'stretch',
    aspectRatio: FRAMES.photo,
    borderRadius: RADII.sm,
    overflow: 'hidden',
    backgroundColor: theme.border,
  },
  film: {
    alignSelf: 'stretch',
    aspectRatio: FRAMES.film,
    borderRadius: RADII.sm,
    overflow: 'hidden',
    backgroundColor: theme.border,
  },
  fill: { position: 'absolute', top: SPACING.none, bottom: SPACING.none, left: SPACING.none, right: SPACING.none },
  // The mark a film is played from sits on its still, in the corner a thumb reaches, on the paper's red.
  play: {
    position: 'absolute',
    left: SPACING.sm,
    bottom: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADII.pill,
    backgroundColor: theme.primary,
  },
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
  head: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: SPACING.sm },
  foot: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  // What the foot says takes all the width the control leaves it, rather than the width of its words. Sized to its
  // words, it broke « Accès libre » under the date on two cards of three far down a section on the phone — 563 pixels
  // of words set on two lines with 891 to spare — while the first card of the same list kept them on one: a cell the
  // list recycles came back holding the width of the item it last showed.
  said: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: SPACING.sm },
}));

type PartProps = Readonly<{
  summary: ArticleSummary;
  action: ReactNode;
  signature: DisplayText | null;
}>;

/**
 * What the item is, over its title, when it is anything but an article — a video, a piece of opinion, a chapter of a
 * series, a running coverage — and who signed it, when it is a column. Nothing at all otherwise: the line over a title
 * used to be drawn on every card, and on a paper whose items name no section and are mostly reserved it held nothing
 * on four cards in five but the space it took, 148 pixels of it on the phone above a title.
 */
function Head({ summary, signature }: Pick<PartProps, 'summary' | 'signature'>): ReactNode {
  const styles = useStyles();
  const word = formatWord(summary.format);
  if (word === null && signature === null) {
    return null;
  }
  return (
    <Box style={styles.head}>
      {word === null ? null : (
        <Text variant="kicker" tone="textPrimary">
          {word}
        </Text>
      )}
      {signature === null ? null : <Text variant="caption">{signature}</Text>}
    </Box>
  );
}

/**
 * What closes a card: when it was published, whether anyone may read it, and the one thing a reader may do to it from
 * the feed.
 *
 * The date is written against the reader's day, on every list alike — the hour for an item of that day, `Hier` for one
 * of the day before, the weekday within the week, the date beyond — so a front of seventeen hours tells last night
 * from this morning and a search reaching back two years says which year. The control keeps one place on every shape,
 * the end of the card, where a thumb leaving it passes: NN/g's finding on saving is that a save nobody can find is a
 * save nobody uses, and it is the one thing on a card that answers a press of its own.
 */
function Foot({ summary, action }: Pick<PartProps, 'summary' | 'action'>): ReactNode {
  const styles = useStyles();
  const today = useToday();
  return (
    <Box style={styles.foot}>
      <Box style={styles.said}>
        <Text variant="caption">{formatWhen(summary.publishedAt, today)}</Text>
        {OPEN[summary.access] ? (
          <Text variant="kicker" tone="textPrimary">
            {t('article.free')}
          </Text>
        ) : null}
      </Box>
      {action}
    </Box>
  );
}

/** The words of a card: its title, whole, and the sentence under it when the shape has room for one. */
function Words({ summary, standfirst }: Readonly<{ summary: ArticleSummary; standfirst: boolean }>): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.words}>
      {/* A headline is never cut. At the clamps the cards were drawn with, the journal's own titles lost their end on
          two cards in five — median 101 signs, 117 on a front page — and what a French headline says after its colon
          is the news; the Guardian, Le Monde and Mediapart cut none of theirs in a feed. */}
      <Text variant="title">{summary.title}</Text>
      {standfirst ? (
        <Text variant="summary" numberOfLines={3}>
          {summary.standfirst}
        </Text>
      ) : null}
    </Box>
  );
}

/** The picture of a card at the width of the block, in its own frame, with the mark a film is played from. */
function Picture({ summary }: Readonly<{ summary: ArticleSummary }>): ReactNode {
  const styles = useStyles();
  const theme = useTheme();
  const visual = pictureOf(summary, 'card');
  const frame = frameOf(summary.format);
  if (visual === null) {
    return null;
  }
  return (
    <Box style={styles[frame]}>
      <Image
        source={visual.source}
        recyclingKey={summary.id}
        announces={DECORATIVE}
        thumbhash={visual.thumbhash}
        style={styles.fill}
      />
      {/* Decorative: the word over the title already says the item is a video, and a reader listening would hear it
          twice. */}
      {frame === 'film' ? (
        <Box style={styles.play}>
          <Icon name="play" announces={DECORATIVE} size={SPACING.md} tintColor={theme.onPrimary} />
        </Box>
      ) : null}
    </Box>
  );
}

/** The front of a page: the picture first, at the width of the block, then the words under it. */
function Lead({ summary, action, signature }: PartProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.card}>
      <Picture summary={summary} />
      <Head summary={summary} signature={signature} />
      <Words summary={summary} standfirst />
      <Foot summary={summary} action={action} />
    </Box>
  );
}

/**
 * A card in a line: the title down the left of the block and a small picture beside it.
 *
 * The title used to run the full width of the card and the picture sat under it, beside the standfirst — so the title
 * was cut at two lines while the room next to the picture went to a sentence, and the card had two left margins, one
 * for the title and one for everything under it. NN/g's rule for a list row is the one this broke: a reader scans a
 * single left edge, so the text keeps one column and the picture takes the other, on the right, where it leaves every
 * title flush against the same edge whether or not a picture is there. It hangs from the top of the title, however
 * long the title runs.
 *
 * It carries no standfirst. On a phone the Guardian shows none on any card and the BBC shows none on any card; Le
 * Monde shows one on fifteen of a hundred and seven. A sentence under every title is what turned this front into a
 * wall of grey where nothing was subordinate to anything.
 */
function Line({ summary, action, signature }: PartProps): ReactNode {
  const styles = useStyles();
  const visual = pictureOf(summary, 'thumbnail');
  return (
    <Box style={styles.card}>
      <Head summary={summary} signature={signature} />
      <Box style={styles.line}>
        <Box style={styles.rest}>
          <Words summary={summary} standfirst={false} />
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
      <Foot summary={summary} action={action} />
    </Box>
  );
}

/**
 * A column, marked as one and signed.
 *
 * The current app prints the word on a red block beside the writer's portrait. The journal's own picture for a column
 * is a vignette — the genre's word and the writer's face printed on a red ground, the same one on every column of the
 * same writer — so it is not the picture of the piece, and the card draws none. The mark is the rule the app draws down
 * the side of a quoted voice, and the word and the name are set where every other card says what it is.
 *
 * It carries no standfirst either. Two columns in three are filed with none, and the service stands in the opening of
 * the body for it, cut at a « … »: a sentence begun, not a sentence about the piece.
 */
function Column({ summary, action, signature }: PartProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.column}>
      <Box style={styles.mark} />
      <Box style={styles.rest}>
        <Box style={styles.card}>
          <Head summary={summary} signature={signature} />
          <Words summary={summary} standfirst={false} />
          <Foot summary={summary} action={action} />
        </Box>
      </Box>
    </Box>
  );
}

/** An item written without a picture: its words are the whole card (capture 02). */
function Brief({ summary, action, signature }: PartProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.card}>
      <Head summary={summary} signature={signature} />
      <Words summary={summary} standfirst />
      <Foot summary={summary} action={action} />
    </Box>
  );
}

/**
 * One article as a feed announces it, in the shape the feed's rhythm gave it.
 *
 * The shape arrives decided: a card does not read the item to choose one, because the list recycles a cell only
 * between items that answered the same shape, and the only place that can answer for a whole feed at once is the one
 * that laid it out. The four shapes are kept in this one file, built of the same four parts, so that what separates
 * them — how much room the picture takes, and whether there is one — can be read at a glance.
 *
 * They are four orderings of one order: what the item is, its title, the sentence under it if the shape has room for
 * one, and what closes it; what changes is the picture. That is Le Monde's card, which runs a whole front off one
 * component and varies which parts are present rather than where they sit, and it is what the fifth shape broke:
 * `stacked` put the title above the picture and the standfirst below it, so two cards a scroll apart taught two
 * different templates for the same four things.
 *
 * `action` is whatever the screen lets a reader do to the article from the feed, and `signature` who signed it. The
 * card takes both already made: an entity may not name a route, nor hold an action of its own.
 */
export function ArticleCard({ shape, summary, action = null, signature = null }: ArticleCardProps): ReactNode {
  const parts = { summary, action, signature };
  switch (shape) {
    case 'lead': {
      return <Lead {...parts} />;
    }
    case 'line': {
      return <Line {...parts} />;
    }
    case 'column': {
      return <Column {...parts} />;
    }
    case 'brief': {
      return <Brief {...parts} />;
    }
  }
}
