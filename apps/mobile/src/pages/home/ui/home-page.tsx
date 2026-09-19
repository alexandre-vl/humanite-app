import { SPACING } from '@huma/design-tokens';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ArticleFeed, feedQuery } from '#entities/article';
import { SectionBar } from '#entities/section';
import { t } from '#i18n';
import { createStyles, useTheme } from '#lib/styles';
import { Box } from '#primitives/box';
import { Icon } from '#primitives/icon';
import { Surface } from '#primitives/surface';
import { Text } from '#primitives/text';

const useStyles = createStyles((theme) => ({
  masthead: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.border },
  search: { position: 'absolute', right: SPACING.lg },
}));

/**
 * The À la une screen: every section at once, under a masthead that collapses behind the band of sections as the feed
 * scrolls. No section is named here, so the band shows none as the one being read; choosing one opens its own screen.
 */
export function HomePage(): ReactNode {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Surface>
      <ArticleFeed
        query={feedQuery}
        onOpen={(id) => {
          router.push({ pathname: '/article/[id]', params: { id } });
        }}
        header={
          <Box style={styles.masthead}>
            <Text variant="display">{t('app.name')}</Text>
            <Box style={styles.search}>
              <Icon name="search" size={SPACING.lg} tintColor={theme.primary} />
            </Box>
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
