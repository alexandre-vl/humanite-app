import type { Article, ArticleId } from '@huma/contracts';
import { SIZES, SPACING } from '@huma/design-tokens';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { t } from '#i18n';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Scroll } from '#primitives/scroll';
import { Text } from '#primitives/text';
import { articleQuery } from '../api/queries';
import { signatureOf } from '../model/byline';
import { formatWord } from '../model/format';
import { stateOf } from '../model/paged-feed';
import { ArticleBody } from './article-body';
import { ArticleLead, ArticleTitle } from './article-lead';
import { FeedStandIn } from './feed-stand-in';

export type ArticleReaderProps = Readonly<{
  id: ArticleId;
  /** The address of a link the reader pressed, or of a film: a page of the web, for the screen to open. */
  onFollow: (url: string) => void;
}>;

type ReadingProps = Readonly<{ article: Article; onFollow: (url: string) => void }>;

const useStyles = createStyles((theme) => ({
  page: { backgroundColor: theme.background },
  // One measure down the page, and one gap between everything on it: the head, the picture, every paragraph and
  // every crosshead are all things read in a row, and a gap that changed between them would be saying they are not.
  column: { gap: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xxxl },
  away: { paddingTop: SPACING.lg },
  rule: { height: SIZES.stroke, marginHorizontal: SPACING.lg, backgroundColor: theme.rule },
  // Flat, level and as wide as the column: the words under a headline, not a slip of paper laid over the page. It was
  // the tilted sheet of a support callout, drawn for one rare appeal inside a body; on a paper that keeps four bodies
  // in five back, it ended nearly every article, and a sheet turned by a degree and a half read as a fault of the page.
  wall: {
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: SIZES.stroke,
    borderColor: theme.primary,
  },
}));

/**
 * Where a body the source keeps back would run: the paper's own words for why the rest is not there, and where a
 * subscription is taken. Nothing of the body is shown, the source having said this reader may not have it.
 *
 * The place is named and not linked. A reader's app may not send its reader to a purchase — the App Store's rule
 * 3.1.1(a), Google Play's payments policy — and the journal's site is where its subscriptions are sold; so the line
 * says where, in words, and nothing on it answers a press.
 */
function Wall(): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.wall}>
      <Text variant="title" heading>
        {t('article.withheld.title')}
      </Text>
      <Text variant="prose">{t('article.withheld.message')}</Text>
      <Text variant="caption">{t('article.withheld.where')}</Text>
    </Box>
  );
}

/**
 * The article as it is read: one page, one ground, from the head of the piece down to its last paragraph.
 *
 * It was two — a coloured band carrying the headline, and under it a white sheet with its top-left corner turned by
 * forty-eight points. Neither half survives inspection. Of the six papers worth copying, none prints an article body
 * on a card: the Guardian, the BBC and Le Monde all draw a front and an article on one ground and separate things
 * with a hairline, and the only rounded-top surfaces in any of their stylesheets are modals and share sheets — Le
 * Figaro's own CSS gives that radius to `.fig-share-tools` and to a tooltip turned into a bottom modal. On a phone
 * the turned corner is a promise that the thing can be swiped away, which an article cannot keep.
 *
 * The dark theme had already said as much by accident: there its ground and its sheet take the same value, the sheet
 * stops showing, and the page runs edge to edge — which is what every article does now.
 *
 * The head is closed by what follows it: a body by a hairline, a wall by its own rule in the paper's red. The hairline
 * used to close the head whatever came next, and on the four articles in five whose body is kept back the phone drew
 * two rules one gap apart — grey, then red — where one says the same.
 */
function Reading({ article, onFollow }: ReadingProps): ReactNode {
  const styles = useStyles();
  return (
    <Scroll axis="vertical" style={styles.page} contentStyle={styles.column}>
      <ArticleTitle title={article.title} word={formatWord(article.format)} />
      <ArticleLead article={article} byline={signatureOf(article)} onFollow={onFollow} />
      {article.body.kind === 'open' ? (
        <>
          <Box style={styles.rule} />
          <ArticleBody article={article} blocks={article.body.blocks} onFollow={onFollow} />
        </>
      ) : (
        <Wall />
      )}
    </Scroll>
  );
}

/**
 * One article, read whole, in one reading: what its body points at comes written into it. The ground it is read on is
 * the screen's to choose — a video's page is dark from its status bar down — and not the reading's.
 */
export function ArticleReader({ id, onFollow }: ArticleReaderProps): ReactNode {
  const styles = useStyles();
  const { data: article, status, error, refetch } = useQuery(articleQuery(id));
  if (article === undefined) {
    const state = stateOf(status, error);
    // A source that will not serve this reader the article at all puts up the same wall as one that keeps its body
    // back: the wall stands in its place, rather than a failure offered a try that cannot pass.
    if (state.kind === 'failed' && state.failure === 'refused') {
      return (
        <Box style={styles.away}>
          <Wall />
        </Box>
      );
    }
    return (
      <FeedStandIn
        state={state}
        onRetry={() => {
          void refetch();
        }}
      />
    );
  }
  return <Reading article={article} onFollow={onFollow} />;
}
