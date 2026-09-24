import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { DECORATIVE } from '../../../lib/announce';
import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { createStyles } from '../../../lib/styles';
import { Progress } from './progress';

const useStyles = createStyles(() => ({ stack: { gap: SPACING.lg } }));

/** Lit and unlit, one above the other, so the two are read as the same rule in two states. */
function ProgressDemo(): ReactNode {
  const styles = useStyles();
  return (
    <View style={styles.stack}>
      <Progress busy announces={DECORATIVE} />
      <Progress busy={false} announces={DECORATIVE} />
    </View>
  );
}

export const catalog: CatalogEntry = {
  name: asDisplayText('Progress'),
  render: () => <ProgressDemo />,
};
