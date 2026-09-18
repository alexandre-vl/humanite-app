import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { createStyles } from '../../../lib/styles';
import { Pressable } from './pressable';

const useStyles = createStyles((theme) => ({
  demo: { width: SPACING.xxxl, height: SPACING.xxxl, borderRadius: RADII.md, backgroundColor: theme.premium },
}));

function PressableDemo(): ReactNode {
  const styles = useStyles();
  return <Pressable style={styles.demo} />;
}

export const catalog: CatalogEntry = {
  name: asDisplayText('Pressable'),
  render: () => <PressableDemo />,
};
