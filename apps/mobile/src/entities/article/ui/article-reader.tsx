import type { Article, ArticleId, ArticleSummary, Author } from '@huma/contracts';
import { RADII, SPACING } from '@huma/design-tokens';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { t } from '#i18n';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Scroll } from '#primitives/scroll';
import { ThemeScope } from '#primitives/theme';
import { articleQuery, authorsQuery, summariesQuery } from '../api/queries';
import { bylineOf } from '../model/byline';
import { stateOf } from '../model/paged-feed';
import type { LinkTarget } from '../model/spans';
import { relatedIds } from '../model/spans';
import { ArticleBody } from './article-body';
import { ArticleLead, ArticleTitle } from './article-lead';
import { FeedStandIn } from './feed-stand-in';

export type ArticleReaderProps = Readonly<{ id: ArticleId; onFollow: (target: LinkTarget) => void }>;

type ReadingProps = Readonly<{
  article: Article;
  related: readonly ArticleSummary[];
  roster: readonly Author[];
  onFollow: (target: LinkTarget) => void;
}>;

const useStyles = createStyles((theme) => ({
  ground: { flex: 1, backgroundColor: theme.ground },
  column: { paddingBottom: SPACING.xxxl },
  sheet: {
    gap: SPACING.lg,
    paddingVertical: SPACING.xl,
    borderTopLeftRadius: RADII.sheet,
    backgroundColor: theme.background,
  },
}));

/**
 * The article as it is read: the headline on the ground, then the sheet it is printed on, turned at its top-left
 * corner. On the dark template the sheet and the ground take the same value, so the sheet stops showing and the page
 * runs edge to edge — which is exactly what the video article of the current app does, without a rule of its own.
 */
function Reading({ article, related, roster, onFollow }: ReadingProps): ReactNode {
  const styles = useStyles();
  return (
    <Scroll axis="vertical" style={styles.ground} contentStyle={styles.column}>
      <ArticleTitle title={article.title} />
      <Box style={styles.sheet}>
        <ArticleLead article={article} byline={bylineOf(article, roster)} />
        <ArticleBody article={article} related={related} onFollow={onFollow} />
      </Box>
    </Scroll>
  );
}

/**
 * One article, read whole. The body arrives first and names the articles it points at; their summaries are asked for
 * in one call rather than one at a time, and the roster of the newsroom — the paper's own list, which nothing a reader
 * does makes stale — turns the ids an article is signed with into names.
 *
 * A video article is laid on the dark theme whatever the reader's phone is set to. That ground belongs to what is
 * being read, not to a setting: the current app prints its videos on it and everything else on the light sheet, and a
 * reader who has chosen dark keeps it for every other article.
 */
export function ArticleReader({ id, onFollow }: ArticleReaderProps): ReactNode {
  const { data: article, status, refetch } = useQuery(articleQuery(id));
  const related = useQuery(summariesQuery(article === undefined ? [] : relatedIds(article.blocks))).data ?? [];
  const roster = useQuery(authorsQuery).data ?? [];
  if (article === undefined) {
    return (
      <FeedStandIn
        state={stateOf(status)}
        onRetry={() => {
          void refetch();
        }}
        error={{ title: t('article.error.title'), message: t('article.error.message') }}
      />
    );
  }
  const reading = <Reading article={article} related={related} roster={roster} onFollow={onFollow} />;
  return article.format === 'video' ? <ThemeScope name="dark">{reading}</ThemeScope> : reading;
}
