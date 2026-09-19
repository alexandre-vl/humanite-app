import { SIZES } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { createStyles } from '../../../lib/styles';
import { Image } from './image';

/** The thumbhash of a real picture of the corpus: what a card paints while its illustration loads. */
const DEMO = '0lYGDIJ4mXZ/h3h2d4VXgIf7hw==';

const useStyles = createStyles(() => ({ demo: { width: SIZES.headerExpanded, height: SIZES.headerExpanded } }));

function ImageDemo(): ReactNode {
  const styles = useStyles();
  return <Image source={{ thumbhash: DEMO }} recyclingKey="demo" style={styles.demo} />;
}

export const catalog: CatalogEntry = {
  name: asDisplayText('Image'),
  render: () => <ImageDemo />,
};
