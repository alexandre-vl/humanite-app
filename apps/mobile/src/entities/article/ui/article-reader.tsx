import type { Article, ArticleId, DisplayText, LinkTarget } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { t } from '#i18n';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Scroll } from '#primitives/scroll';
import { ThemeScope } from '#primitives/theme';
import { articleQuery } from '../api/queries';
import { signatureOf } from '../model/byline';
import { stateOf } from '../model/paged-feed';
import type { SectionNames } from '../model/section-names';
import { ArticleBody } from './article-body';
import { ArticleCallout } from './article-callout';
import { ArticleLead, ArticleTitle } from './article-lead';
import { FeedStandIn } from './feed-stand-in';

export type ArticleReaderProps = Readonly<{
  id: ArticleId;
  /** What the newsroom calls the section an article ran in, answered by the screen. */
  names: SectionNames;
  onFollow: (target: LinkTarget) => void;
  onSupport: () => void;
}>;

type ReadingProps = Readonly<{
  article: Article;
  name: DisplayText | null;
  onFollow: (target: LinkTarget) => void;
  onSupport: () => void;
}>;

const useStyles = createStyles((theme) => ({
  page: { flex: 1, backgroundColor: theme.background },
  // One measure down the page, and one gap between everything on it: the head, the picture, every paragraph and
  // every crosshead are all things read in a row, and a gap that changed between them would be saying they are not.
  column: { gap: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xxxl },
  wall: { paddingTop: SPACING.lg },
}));

/**
 * The call to subscribe, where a body the source keeps back would run: the paper's own words for why the rest is not
 * there, and the one thing a reader can do about it. It is laid as the call for support a body can carry, because it
 * is one — and nothing of the body is shown, the source having said this reader may not have it.
 */
function Wall({ onSupport }: Readonly<{ onSupport: () => void }>): ReactNode {
  return (
    <ArticleCallout
      title={t('article.withheld.title')}
      text={t('article.withheld.message')}
      button={t('article.subscribe')}
      onPress={onSupport}
    />
  );
}

/**
 * The article as it is read: one page, one ground, from the section over the headline down to the last paragraph.
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
 */
function Reading({ article, name, onFollow, onSupport }: ReadingProps): ReactNode {
  const styles = useStyles();
  return (
    <Scroll axis="vertical" style={styles.page} contentStyle={styles.column}>
      <ArticleTitle title={article.title} name={name} />
      <ArticleLead article={article} byline={signatureOf(article)} />
      {article.body.kind === 'open' ? (
        <ArticleBody article={article} blocks={article.body.blocks} onFollow={onFollow} onSupport={onSupport} />
      ) : (
        <Wall onSupport={onSupport} />
      )}
    </Scroll>
  );
}

/**
 * One article, read whole, in one reading: what its body points at comes written into it.
 *
 * A video article is laid on the dark theme whatever the reader's phone is set to. That ground belongs to what is
 * being read, not to a setting: the current app prints its videos on it and everything else on the light sheet, and a
 * reader who has chosen dark keeps it for every other article.
 */
export function ArticleReader({ id, names, onFollow, onSupport }: ArticleReaderProps): ReactNode {
  const styles = useStyles();
  const { data: article, status, error, refetch } = useQuery(articleQuery(id));
  if (article === undefined) {
    const state = stateOf(status, error);
    // A source that will not serve this reader the article at all puts up the same wall as one that keeps its body
    // back: the call to subscribe stands in its place, rather than a failure offered a try that cannot pass.
    if (state.kind === 'failed' && state.failure === 'refused') {
      return (
        <Box style={styles.wall}>
          <Wall onSupport={onSupport} />
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
  const reading = <Reading article={article} name={names(article.section)} onFollow={onFollow} onSupport={onSupport} />;
  return article.format === 'video' ? <ThemeScope name="dark">{reading}</ThemeScope> : reading;
}
