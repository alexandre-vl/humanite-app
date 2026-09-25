import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { createStyles } from '../../../lib/styles';
import { Box } from '../../primitives/box';
import { LabelBar } from './label-bar';

/** The front and the sections after it, which is what the band names on the front page. */
const ITEMS = [
  { id: 'front', label: asDisplayText('À la une') },
  { id: 'politique', label: asDisplayText('Politique') },
  { id: 'monde', label: asDisplayText('Monde') },
] as const;

const useStyles = createStyles((theme) => ({
  // The row that lays the labels out, which on the front page is the pager's band: the row itself is a run of labels
  // and nothing else, so a catalogue showing it has to lay one. The rule that travels under the chosen one is the
  // band's and is not here — it moves with the pages, and there are no pages in a catalogue.
  row: { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: SPACING.xs, backgroundColor: theme.surface },
}));

function LabelBarDemo(): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.row}>
      <LabelBar items={ITEMS} active="front" onSelect={() => undefined} />
    </Box>
  );
}

export const catalog: CatalogEntry = {
  name: asDisplayText('LabelBar'),
  render: () => <LabelBarDemo />,
};
