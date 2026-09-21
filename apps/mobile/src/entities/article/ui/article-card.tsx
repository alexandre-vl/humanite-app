import type { Access, ArticleSummary, DisplayText } from '@huma/contracts';
import { RADII, SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { pictureOf } from '#api';
import { Badge } from '#components/badge';
import { t } from '#i18n';
import { DECORATIVE } from '#lib/announce';
import { formatDate } from '#lib/format';
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
  card: { gap: SPACING.xs },
  picture: { alignSelf: 'stretch', aspectRatio: HERO_RATIO, borderRadius: RADII.sm, backgroundColor: theme.border },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md },
  thumbnail: {
    width: SIZES.thumbnail,
    aspectRatio: THUMBNAIL_RATIO,
    borderRadius: RADII.sm,
    backgroundColor: theme.border,
  },
  rest: { flex: 1 },
  // The word and the writer are printed together on the paper's red, which is where the current app puts them. White
  // on that red is the one pairing this paper prints under the WCAG bar, at 3.83 to 1: the tokens name the departure
  // and hold it there rather than leave it unsaid.
  mark: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADII.sm,
    backgroundColor: theme.primary,
  },
  // The date, the mark of a reserved article and whatever the screen lets a reader do share the last line. The
  // current app gives the premium mark a line of its own, which leaves it stranded beside nothing (capture 09); here
  // every shape ends on the same line of facts, so one card recycled into another never changes its count of rows.
  facts: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  said: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
}));

type FactsProps = Readonly<{ summary: ArticleSummary; action: ReactNode }>;

/** The line of facts every card ends on: when it was published, who may read it, and what the screen offers. */
function Facts({ summary, action }: FactsProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.facts}>
      <Box style={styles.said}>
        <Text variant="caption">{formatDate(summary.publishedAt)}</Text>
        {MARKED[summary.access] ? <Badge label={t('article.premium')} /> : null}
      </Box>
      {action}
    </Box>
  );
}

type BodyProps = Readonly<{
  summary: ArticleSummary;
  action: ReactNode;
  signature: DisplayText | null;
  name: DisplayText | null;
}>;

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
      <Kicker name={name} />
      <Text variant="title" numberOfLines={3}>
        {summary.title}
      </Text>
      <Text variant="summary" numberOfLines={3}>
        {summary.standfirst}
      </Text>
      <Facts summary={summary} action={action} />
    </Box>
  );
}

/** The card a block opens on: the title is read first and the picture answers it (capture 18). */
function Stacked({ summary, action, name }: BodyProps): ReactNode {
  const styles = useStyles();
  const visual = pictureOf(summary, 'card');
  return (
    <Box style={styles.card}>
      <Kicker name={name} />
      <Text variant="title" numberOfLines={3}>
        {summary.title}
      </Text>
      {visual === null ? null : (
        <Image
          source={visual.source}
          recyclingKey={summary.id}
          announces={DECORATIVE}
          thumbhash={visual.thumbhash}
          style={styles.picture}
        />
      )}
      <Text variant="summary" numberOfLines={4}>
        {summary.standfirst}
      </Text>
      <Facts summary={summary} action={action} />
    </Box>
  );
}

/** A card in a line: the title across the block, then a small picture and the standfirst beside it (captures 09, 19). */
function Line({ summary, action, name }: BodyProps): ReactNode {
  const styles = useStyles();
  const visual = pictureOf(summary, 'thumbnail');
  return (
    <Box style={styles.card}>
      <Kicker name={name} />
      <Text variant="title" numberOfLines={2}>
        {summary.title}
      </Text>
      <Box style={styles.line}>
        {visual === null ? null : (
          <Image
            source={visual.source}
            recyclingKey={summary.id}
            announces={DECORATIVE}
            thumbhash={visual.thumbhash}
            style={styles.thumbnail}
          />
        )}
        <Box style={styles.rest}>
          <Text variant="summary" numberOfLines={3}>
            {summary.standfirst}
          </Text>
        </Box>
      </Box>
      <Facts summary={summary} action={action} />
    </Box>
  );
}

/**
 * A column, marked as one and signed.
 *
 * The current app prints the word on a red block beside the writer's portrait, and leaves the other half of the card
 * empty — no standfirst, no date (capture 18). The portrait is not the paper's to print here: the corpus files no
 * likeness of anyone, and inventing one for a writer who does not exist would be a picture of a person. So the mark
 * carries the word and the name, and the card keeps the standfirst and the date every other shape ends on.
 */
function Column({ summary, action, signature }: BodyProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.card}>
      <Box style={styles.mark}>
        <Text variant="label" tone="onPrimary">
          {t('article.column')}
        </Text>
        {signature === null ? null : (
          <Text variant="caption" tone="onPrimary">
            {signature}
          </Text>
        )}
      </Box>
      <Text variant="title" numberOfLines={3}>
        {summary.title}
      </Text>
      <Text variant="summary" numberOfLines={3}>
        {summary.standfirst}
      </Text>
      <Facts summary={summary} action={action} />
    </Box>
  );
}

/** An item written without a picture: its words are the whole card (capture 02). */
function Brief({ summary, action, name }: BodyProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.card}>
      <Kicker name={name} />
      <Text variant="title" numberOfLines={3}>
        {summary.title}
      </Text>
      <Text variant="summary" numberOfLines={3}>
        {summary.standfirst}
      </Text>
      <Facts summary={summary} action={action} />
    </Box>
  );
}

/**
 * One article as a feed announces it, in the shape the feed's rhythm gave it.
 *
 * The shape arrives decided: a card does not read the item to choose one, because the list recycles a cell only
 * between items that answered the same shape, and the only place that can answer for a whole feed at once is the one
 * that laid it out. The five shapes are kept in this one file so that what separates them — the order of the same
 * four things, and the frame around the picture — can be read at a glance rather than diffed across five.
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
    case 'stacked': {
      return <Stacked {...body} />;
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
