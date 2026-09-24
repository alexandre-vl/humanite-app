import type { Article, ArticleId, ArticleSummary } from '@huma/contracts';
import { SIZES, SPACING } from '@huma/design-tokens';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Button } from '#components/button';
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
import { ProseStandIn } from './prose-stand-in';

export type ArticleReaderProps = Readonly<{
  id: ArticleId;
  /**
   * What the app already knew of this article when the screen opened, or nothing when it knew none of it.
   *
   * A reader reaches an article by touching a card, and that card was drawn from a summary that holds every field of
   * the article but its body. Handed in, it lets the head be drawn at once — the real title, the real standfirst,
   * the real signature, the real picture — with only the body waiting on the service. Handed nothing, as a link
   * opened from outside hands nothing, the screen stands in for the whole of itself as it always did.
   *
   * The screen finds it, not this: what the app has read is a thing of the app's cache and of a shelf the reader
   * keeps, neither of which an article knows about.
   */
  known: ArticleSummary | null;
  /** The address of a link the reader pressed, or of a film: a page of the web, for the screen to open. */
  onFollow: (url: string) => void;
  /**
   * Where a subscriber signs in, or `null` when there is nobody to sign in — a build with no way to open a
   * connection, or a reader already signed in, for whom a wall means the journal withheld this from them too.
   *
   * The screen decides it. This reading knows a body was kept back; only the screen knows whether the app has a
   * connection to offer, which is a thing of the app and not of the article.
   */
  onSignIn: (() => void) | null;
}>;

type ReadingProps = Readonly<{ article: Article; onFollow: (url: string) => void; onSignIn: (() => void) | null }>;

type PageProps = Readonly<{
  summary: ArticleSummary;
  onFollow: (url: string) => void;
  children: ReactNode;
}>;

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
 * The place a subscription is bought is named and not linked. A reader's app may not send its reader to a purchase —
 * the App Store's rule 3.1.1(a), Google Play's payments policy — and the journal's site is where its subscriptions
 * are sold; so that line says where, in words, and nothing on it answers a press.
 *
 * Signing in is the other thing, and is not a purchase: a subscriber who has already paid is being asked to prove it,
 * which is the one thing they can do here and the one place they are most likely to want to. Leaving it out sent them
 * looking through the account screen for a way back to the article they were reading, and told them meanwhile to go
 * and buy what they had bought.
 */
function Wall({ onSignIn }: Readonly<{ onSignIn: (() => void) | null }>): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.wall}>
      <Text variant="title" heading>
        {t('article.withheld.title')}
      </Text>
      <Text variant="prose">{t('article.withheld.message')}</Text>
      {onSignIn === null ? null : <Button label={t('article.withheld.signIn')} onPress={onSignIn} />}
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
function Page({ summary, onFollow, children }: PageProps): ReactNode {
  const styles = useStyles();
  return (
    <Scroll axis="vertical" style={styles.page} contentStyle={styles.column}>
      <ArticleTitle title={summary.title} word={formatWord(summary.format)} />
      <ArticleLead article={summary} byline={signatureOf(summary)} onFollow={onFollow} />
      {children}
    </Scroll>
  );
}

function Reading({ article, onFollow, onSignIn }: ReadingProps): ReactNode {
  const styles = useStyles();
  return (
    <Page summary={article} onFollow={onFollow}>
      {article.body.kind === 'open' ? (
        <>
          <Box style={styles.rule} />
          <ArticleBody article={article} blocks={article.body.blocks} onFollow={onFollow} />
        </>
      ) : (
        <Wall onSignIn={onSignIn} />
      )}
    </Page>
  );
}

/**
 * One article, read whole, in one reading: what its body points at comes written into it. The ground it is read on is
 * the screen's to choose — a video's page is dark from its status bar down — and not the reading's.
 */
export function ArticleReader({ id, known, onFollow, onSignIn }: ArticleReaderProps): ReactNode {
  const styles = useStyles();
  const { data: article, status, error, refetch } = useQuery(articleQuery(id));
  if (article === undefined) {
    const state = stateOf(status, error);
    // A source that will not serve this reader the article at all puts up the same wall as one that keeps its body
    // back: the wall stands in its place, rather than a failure offered a try that cannot pass.
    if (state.kind === 'failed' && state.failure === 'refused') {
      return (
        <Box style={styles.away}>
          <Wall onSignIn={onSignIn} />
        </Box>
      );
    }
    // The article is on its way and the app already knew its head: the page opens on the real thing, and only what
    // is under the hairline is a ghost. A failure is not drawn this way — a head over a stand-in would say the rest
    // is coming, and it is not.
    if (state.kind === 'pending' && known !== null) {
      return (
        <Page summary={known} onFollow={onFollow}>
          <Box style={styles.rule} />
          <ProseStandIn />
        </Page>
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
  return <Reading article={article} onFollow={onFollow} onSignIn={onSignIn} />;
}
