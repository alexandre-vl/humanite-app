import { RADII, SPACING, THEME_NAMES } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { createStyles } from '../../../lib/styles';
import { ThemeScope } from './theme-scope';

const useStyles = createStyles((theme) => ({
  row: { flexDirection: 'row', gap: SPACING.sm },
  ground: { flex: 1, padding: SPACING.md, borderRadius: RADII.md, backgroundColor: theme.ground },
  sheet: { gap: SPACING.xs, padding: SPACING.md, borderRadius: RADII.sm, backgroundColor: theme.background },
  headline: { height: SPACING.md, borderRadius: RADII.sm, backgroundColor: theme.headline },
  text: { height: SPACING.md, borderRadius: RADII.sm, backgroundColor: theme.textPrimary },
  muted: { height: SPACING.md, borderRadius: RADII.sm, backgroundColor: theme.textMuted },
}));

/** One theme's reading roles as bands: the ground it lays a sheet on, then the three colours a sheet carries text in. */
function Sample(): ReactNode {
  const styles = useStyles();
  return (
    <View style={styles.ground}>
      <View style={styles.sheet}>
        <View style={styles.headline} />
        <View style={styles.text} />
        <View style={styles.muted} />
      </View>
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
