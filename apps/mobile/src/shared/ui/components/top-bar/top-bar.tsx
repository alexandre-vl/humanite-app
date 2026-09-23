import type { DisplayText } from '@huma/contracts';
import { SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { t } from '../../../i18n';
import { DECORATIVE } from '../../../lib/announce';
import { createStyles } from '../../../lib/styles';
import { Box } from '../../primitives/box';
import { ICONS, Icon } from '../../primitives/icon';
import { Pressable } from '../../primitives/pressable';
import { Text } from '../../primitives/text';

export type TopBarProps = Readonly<{
  /** What the screen is called, laid in the middle of the bar. A screen whose first words name it needs none. */
  title?: DisplayText | undefined;
  /**
   * Whether the middle of the bar names one screen or names the paper. The front page carries the masthead, set in
   * the red and the letters a masthead is set in; every other screen carries its own title, set as a label.
   */
  names?: 'screen' | 'paper';
  /** What leaving this screen does. A screen nothing pushed is left by the tab bar and takes none. */
  onBack?: (() => void) | undefined;
  /**
   * The one thing the screen lets a reader do to what it is showing, hung at the far end in the square the way back
   * is given at the near one — so whatever the control draws, it stands as far from the edge on every screen.
   */
  action?: ReactNode;
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
  // Laid over the row, not in it: the name stays in the middle of the screen whether the bar carries a control at one
  // end, at both or at neither. Both ends are kept free by the same margin, so the name is centred on the screen and
  // not on what is left of it.
  middle: {
    position: 'absolute',
    top: SPACING.none,
    bottom: SPACING.none,
    left: SIZES.barSide,
    right: SIZES.barSide,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Each end of the bar is one grid step square, whatever it holds or whether it holds anything. A control hung there
  // used to take its own size: on an A065 the article's marque-page, once kept, drew its disc 22 pixels from the edge
  // of the screen, where the front page's control stood 58 from it — the same corner, a thumb's width apart.
  end: { width: SPACING.xxxl, height: SPACING.xxxl, alignItems: 'center', justifyContent: 'center' },
  target: { alignSelf: 'stretch', flex: 1, alignItems: 'center', justifyContent: 'center' },
}));

export type TopBarButtonProps = Readonly<{
  icon: keyof typeof ICONS;
  /** What pressing it does, which is the only thing a reader listening rather than looking is told. */
  label: DisplayText;
  onPress: () => void;
}>;

/**
 * One control hung off a bar: a symbol, and the word that says what it does.
 *
 * A symbol says nothing out loud, so the word is not a courtesy — it is the whole of what a screen reader reads, and
 * the only thing a parcours can press. The target is the whole square the bar gives the end it hangs from, whatever
 * the symbol measures.
 */
export function TopBarButton({ icon, label, onPress }: TopBarButtonProps): ReactNode {
  const styles = useStyles();
  return (
    <Pressable style={styles.target} label={label} role="button" onPress={onPress}>
      <Icon name={icon} announces={DECORATIVE} />
    </Pressable>
  );
}

/**
 * The bar across the top of a screen: the way back, what the screen is called, and what it lets a reader do.
 *
 * It is the app's own and not the platform's. A native stack header was drawn here for a while and cost the paper
 * both a measurement and a design: `react-native-screens` pads its toolbar from the window's decor view whatever the
 * app has already inset above it, so every pushed screen opened on an empty band the height of the status bar; and a
 * bar the platform lays out takes none of the style table, so neither the paper's own letters nor a second control
 * could be put in one. Drawn here, the same bar serves every screen, pushed or not.
 *
 * The name is laid over the row rather than placed in it. Placed in it, a bar with a way back and nothing at the other
 * end would centre its name on what the control left over, which is not the middle of anything.
 */
export function TopBar({ title, names = 'screen', onBack, action }: TopBarProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.bar}>
      {title === undefined ? null : (
        <Box style={styles.middle}>
          <Text variant={names === 'paper' ? 'masthead' : 'label'} align="center" numberOfLines={1} heading>
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
      <Box style={styles.end}>{action}</Box>
    </Box>
  );
}
