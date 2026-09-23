import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { createStyles } from '../../../lib/styles';
import { Scroll } from './scroll';

/** More tiles than a phone is wide, so the band has somewhere to go. */
const TILES = [...Array.from({ length: 12 }).keys()];

const useStyles = createStyles((theme) => ({
  band: { gap: SPACING.sm },
  tile: { width: SPACING.xxxl, height: SPACING.xxxl, borderRadius: RADII.md, backgroundColor: theme.card },
}));

/** A band that scrolls across: the one axis a region may take beside the list a screen already scrolls down. */
function ScrollDemo(): ReactNode {
  const styles = useStyles();
  return (
    <Scroll axis="horizontal" contentStyle={styles.band}>
      {TILES.map((tile) => (
        <View key={tile} style={styles.tile} />
      ))}
    </Scroll>
  );
}

export const catalog: CatalogEntry = {
  name: asDisplayText('Scroll'),
  render: () => <ScrollDemo />,
};
