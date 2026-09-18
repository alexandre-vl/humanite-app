import { SPACING } from '@huma/design-tokens';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Button } from '#components/button';
import { EmptyState } from '#components/empty-state';
import { Skeleton } from '#components/skeleton';
import { t } from '#i18n';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import type { FeedOptions } from '../api/queries';
import { ArticleCard } from './article-card';

export type ArticleFeedProps = Readonly<{ query: FeedOptions }>;

const useStyles = createStyles(() => ({
  feed: { gap: SPACING.md, padding: SPACING.lg },
  retry: { alignItems: 'center' },
}));

/** A paged feed of articles, and what stands in its place while it loads, when it fails and when it holds nothing. */
export function ArticleFeed({ query }: ArticleFeedProps): ReactNode {
  const styles = useStyles();
  const { data, isPending, isError, refetch } = useInfiniteQuery(query);
  if (isPending) {
    return (
      <Box style={styles.feed}>
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </Box>
    );
  }
  if (isError) {
    return (
      <Box style={styles.feed}>
        <EmptyState title={t('feed.error.title')} message={t('feed.error.message')} />
        <Box style={styles.retry}>
          <Button
            label={t('action.retry')}
            onPress={() => {
              void refetch();
            }}
          />
        </Box>
      </Box>
    );
  }
  const summaries = data.pages.flatMap((page) => page.items);
  if (summaries.length === 0) {
    return <EmptyState title={t('feed.empty.title')} message={t('feed.empty.message')} />;
  }
  return (
    <Box style={styles.feed}>
      {summaries.map((summary) => (
        <ArticleCard key={summary.id} summary={summary} />
      ))}
    </Box>
  );
}
