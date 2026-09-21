import type { DisplayText } from '@huma/contracts';
import { SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { t } from '../../../i18n';
import { DECORATIVE } from '../../../lib/announce';
import { createStyles } from '../../../lib/styles';
import { Box } from '../../primitives/box';
import { Icon } from '../../primitives/icon';
import { Pressable } from '../../primitives/pressable';
import { Text } from '../../primitives/text';

export type TopBarProps = Readonly<{
  /** What the screen is called, laid in the middle of the bar. A screen whose first words name it needs none. */
  title?: DisplayText | undefined;
  /** What leaving this screen does. A screen nothing pushed is left by the tab bar and takes none. */
  onBack?: (() => void) | undefined;
  /** What the screen lets a reader do to what it is showing, hung at the far end. */
  actions?: ReactNode;
}>;

const useStyles = createStyles((theme) => ({
  // The bar grows past its height rather than clipping: the name is set in the reader's own step, and at the largest
  // one a fixed slab would cut the letters it exists to carry.
  bar: {
    minHeight: SIZES.bar,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    backgroundColor: theme.background,
  },
  // Laid over the row, not in it: the name stays in the middle of the screen whether the bar carries one control or
  // three. Both ends are kept free by the same margin, so the name is centred on the screen and not on what is left
  // of it.
  middle: {
    position: 'absolute',
    top: SPACING.none,
    bottom: SPACING.none,
    left: SIZES.barSide,
    right: SIZES.barSide,
    alignItems: 'center',
    justifyContent: 'center',
  },
  end: { flexDirection: 'row', alignItems: 'center' },
  target: { width: SPACING.xxxl, height: SPACING.xxxl, alignItems: 'center', justifyContent: 'center' },
}));

/**
 * The bar across the top of a screen: the way back, what the screen is called, and what it lets a reader do.
 *
 * It is the app's own and not the platform's. A native stack header was drawn here for a while and cost the paper
 * both a measurement and a design: `react-native-screens` pads its toolbar from the window's decor view whatever the
 * app has already inset above it, so every pushed screen opened on an empty band the height of the status bar; and a
 * bar the platform lays out takes none of the style table, so neither the paper's own letters nor a second control
 * could be put in one. Drawn here, the same bar serves every screen, pushed or not.
 *
 * The name is laid over the row rather than placed in it. Placed in it, a bar with one control on the left and two on
 * the right would centre its name on what those controls left over, which is not the middle of anything.
 */
export function TopBar({ title, onBack, actions }: TopBarProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.bar}>
      {title === undefined ? null : (
        <Box style={styles.middle}>
          <Text variant="label" align="center" numberOfLines={1} heading>
            {title}
          </Text>
        </Box>
      )}
      <Box style={styles.end}>
        {onBack === undefined ? null : (
          <Pressable style={styles.target} label={t('action.back')} role="button" onPress={onBack}>
            <Icon name="back" announces={DECORATIVE} />
          </Pressable>
        )}
      </Box>
      <Box style={styles.end}>{actions}</Box>
    </Box>
  );
}
