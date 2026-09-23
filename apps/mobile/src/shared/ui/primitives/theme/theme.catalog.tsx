import { RADII, SIZES, SPACING, THEME_NAMES } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { createStyles } from '../../../lib/styles';
import { ThemeScope } from './theme-scope';

const useStyles = createStyles((theme) => ({
  row: { flexDirection: 'row', gap: SPACING.sm },
  page: {
    flex: 1,
    gap: SPACING.xs,
    padding: SPACING.md,
    borderWidth: SIZES.stroke,
    borderColor: theme.rule,
    borderRadius: RADII.md,
    backgroundColor: theme.background,
  },
  headline: { height: SPACING.md, borderRadius: RADII.sm, backgroundColor: theme.headline },
  primary: { height: SPACING.md, borderRadius: RADII.sm, backgroundColor: theme.textPrimary },
  secondary: { height: SPACING.md, borderRadius: RADII.sm, backgroundColor: theme.textSecondary },
  muted: { height: SPACING.md, borderRadius: RADII.sm, backgroundColor: theme.textMuted },
}));

/** One theme's reading roles as bands on its page, ruled at its edge: the headline, then the three inks, in order. */
function Sample(): ReactNode {
  const styles = useStyles();
  return (
    <View style={styles.page}>
      <View style={styles.headline} />
      <View style={styles.primary} />
      <View style={styles.secondary} />
      <View style={styles.muted} />
    </View>
  );
}

function ThemeScopeDemo(): ReactNode {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      {THEME_NAMES.map((name) => (
        <ThemeScope key={name} name={name}>
          <Sample />
        </ThemeScope>
      ))}
    </View>
  );
}

export const catalog: CatalogEntry = {
  name: asDisplayText('ThemeScope'),
  render: () => <ThemeScopeDemo />,
};
