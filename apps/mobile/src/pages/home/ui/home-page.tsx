import { FONT_FAMILIES, RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { t } from '#i18n';
import { useStartup } from '#lib/startup';
import { createStyles, useTheme } from '#lib/styles';
import { Box } from '#primitives/box';
import { CollapsibleHeader } from '#primitives/collapsible-header';
import { Icon } from '#primitives/icon';
import { Image } from '#primitives/image';
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
  displayText: { fontFamily: FONT_FAMILIES.display },
  card: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    aspectRatio: 16 / 9,
    borderRadius: RADII.md,
    backgroundColor: theme.card,
  },
}));

/** A BlurHash literal standing in for each article's lead image until the reading phase wires real photos. */
const PLACEHOLDER = 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4';
const FEED = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/** The À la une screen: the masthead collapses behind the section bar as the placeholder feed scrolls. */
export function HomePage(): ReactNode {
  const { signalFirstLayout } = useStartup();
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Surface onLayout={signalFirstLayout}>
      <CollapsibleHeader
        header={
          <Box style={styles.masthead}>
            <Text style={styles.displayText}>{t('app.name')}</Text>
          </Box>
        }
        sticky={
          <Box style={styles.sticky}>
            <Icon name="search" size={SPACING.lg} tintColor={theme.primary} />
            <Text style={styles.displayText}>{t('nav.headline')}</Text>
          </Box>
        }
      >
        {FEED.map((id) => (
          <Image key={id} source={{ blurhash: PLACEHOLDER }} style={styles.card} />
        ))}
      </CollapsibleHeader>
    </Surface>
  );
}
