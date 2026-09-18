import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { ArticleFeed, feedQuery } from '#entities/article';
import { t } from '#i18n';
import { useStartup } from '#lib/startup';
import { createStyles, useTheme } from '#lib/styles';
import { Box } from '#primitives/box';
import { CollapsibleHeader } from '#primitives/collapsible-header';
import { Icon } from '#primitives/icon';
import { Surface } from '#primitives/surface';
import { Text } from '#primitives/text';

const useStyles = createStyles((theme) => ({
  masthead: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.border },
  sticky: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: theme.surface,
  },
}));

/** The À la une screen: the masthead collapses behind the section bar as the feed scrolls. */
export function HomePage(): ReactNode {
  const { signalFirstLayout } = useStartup();
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Surface onLayout={signalFirstLayout}>
      <CollapsibleHeader
        header={
          <Box style={styles.masthead}>
            <Text variant="display">{t('app.name')}</Text>
          </Box>
        }
        sticky={
          <Box style={styles.sticky}>
            <Icon name="search" size={SPACING.lg} tintColor={theme.primary} />
            <Text variant="display">{t('nav.headline')}</Text>
          </Box>
        }
      >
        <ArticleFeed query={feedQuery} />
      </CollapsibleHeader>
    </Surface>
  );
}
