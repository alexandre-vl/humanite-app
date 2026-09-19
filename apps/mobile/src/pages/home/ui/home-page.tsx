import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ArticleFeed, feedQuery, usePagedFeed } from '#entities/article';
import { SectionBar } from '#entities/section';
import { t } from '#i18n';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Surface } from '#primitives/surface';
import { Text } from '#primitives/text';

const useStyles = createStyles((theme) => ({
  masthead: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.border },
}));

/**
 * The À la une screen: every section at once, under a masthead that collapses behind the band of sections as the feed
 * scrolls. No section is named here, so the band shows none as the one being read; choosing one opens its own screen.
 *
 * The masthead carries the paper's name and nothing else. It held a magnifier for a while, drawn but answering to
 * nothing; searching is now a destination of its own, and a second way in that scrolls away with the masthead would
 * be a worse one.
 */
export function HomePage(): ReactNode {
  const styles = useStyles();
  const feed = usePagedFeed(feedQuery);
  return (
    <Surface>
      <ArticleFeed
        feed={feed}
        onOpen={(id) => {
          router.push({ pathname: '/article/[id]', params: { id } });
        }}
        header={
          <Box style={styles.masthead}>
            <Text variant="display">{t('app.name')}</Text>
          </Box>
        }
        sticky={
          <SectionBar
            onSelect={(section) => {
              router.push({ pathname: '/section/[id]', params: { id: section } });
            }}
          />
        }
      />
    </Surface>
  );
}
