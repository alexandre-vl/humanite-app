import { FONT_FAMILIES, LIGHT_THEME, RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { t } from '#i18n';
import { useStartup } from '#lib/startup';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { CollapsibleHeader } from '#primitives/collapsible-header';
import { Surface } from '#primitives/surface';
import { Text } from '#primitives/text';

const styles = createStyles({
  masthead: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: LIGHT_THEME.border },
  sticky: { flex: 1, justifyContent: 'center', paddingHorizontal: SPACING.lg, backgroundColor: LIGHT_THEME.surface },
  displayText: { fontFamily: FONT_FAMILIES.display },
  card: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    paddingVertical: SPACING.xxxl,
    borderRadius: RADII.md,
    backgroundColor: LIGHT_THEME.card,
  },
});

/** Placeholder feed rows: enough to scroll and drive the header until the real fil arrives in the reading phase. */
const FEED = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/** The À la une screen: the masthead collapses behind the section bar as the placeholder feed scrolls. */
export function HomePage(): ReactNode {
  const { signalFirstLayout } = useStartup();
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
            <Text style={styles.displayText}>{t('nav.headline')}</Text>
          </Box>
        }
      >
        {FEED.map((id) => (
          <Box key={id} style={styles.card} />
        ))}
      </CollapsibleHeader>
    </Surface>
  );
}
