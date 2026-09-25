import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { createStyles } from '../../../lib/styles';
import { Breathing } from './breathing';

const useStyles = createStyles((theme) => ({
  demo: { gap: SPACING.sm },
  line: { height: SPACING.md, borderRadius: RADII.sm, backgroundColor: theme.standIn },
  row: { flexDirection: 'row' },
  tail: { flex: 3, height: SPACING.md, borderRadius: RADII.sm, backgroundColor: theme.standIn },
  rest: { flex: 2 },
}));

function BreathingDemo(): ReactNode {
  const styles = useStyles();
  return (
    <Breathing style={styles.demo}>
      <View style={styles.line} />
      <View style={styles.line} />
      <View style={styles.row}>
        <View style={styles.tail} />
        <View style={styles.rest} />
      </View>
    </Breathing>
  );
}

export const catalog: CatalogEntry = {
  name: asDisplayText('Breathing'),
  render: () => <BreathingDemo />,
};
