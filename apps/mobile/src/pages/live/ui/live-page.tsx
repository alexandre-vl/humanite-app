import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { ArticleFeed, liveFeedQuery } from '#entities/article';
import { t } from '#i18n';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Scroll } from '#primitives/scroll';
import { Surface } from '#primitives/surface';
import { Text } from '#primitives/text';

const useStyles = createStyles(() => ({
  heading: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
}));

/** The En continu screen: the same articles as a wire that scrolls under its own title. */
export function LivePage(): ReactNode {
  const styles = useStyles();
  return (
    <Surface>
      <Scroll>
        <Box style={styles.heading}>
          <Text variant="display">{t('nav.live')}</Text>
        </Box>
        <ArticleFeed query={liveFeedQuery} />
      </Scroll>
    </Surface>
  );
}
