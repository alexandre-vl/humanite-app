import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import type { CatalogEntry } from '../../../lib/catalogue';
import { createStyles } from '../../../lib/styles';
import { asDisplayText } from '../../../lib/display-text';
import { Box } from '../../primitives/box';
import { GhostLines } from './ghost';

const useStyles = createStyles(() => ({ stack: { gap: SPACING.lg } }));

/** The three weights, each stopping short where a block of prose would. */
function GhostDemo(): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.stack}>
      <GhostLines lines={['lead-1', 'lead-2']} weight="lead" stops="nearly" />
      <GhostLines lines={['title-1', 'title-2', 'title-3']} weight="title" stops="halfway" />
      <GhostLines lines={['small-1', 'small-2']} weight="small" stops="nearly" />
    </Box>
  );
}

export const catalog: CatalogEntry = {
  name: asDisplayText('Ghost'),
  render: () => <GhostDemo />,
};
