import { SIZES } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { DECORATIVE } from '../../../lib/announce';
import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { createStyles } from '../../../lib/styles';
import { Image } from './image';

/**
 * A thumbhash, as a card receives one: what the view paints while the picture loads. The catalogue owns this sample
 * instead of reading one from the corpus — a primitive may not import the content — so it claims to match no
 * illustration the app ships, and nothing has to keep the two equal.
 */
const DEMO = '0lYGDIJ4mXZ/h3h2d4VXgIf7hw==';

const useStyles = createStyles(() => ({ demo: { width: SIZES.thumbnail, height: SIZES.thumbnail } }));

function ImageDemo(): ReactNode {
  const styles = useStyles();
  return <Image source={{ thumbhash: DEMO }} recyclingKey="demo" announces={DECORATIVE} style={styles.demo} />;
}

export const catalog: CatalogEntry = {
  name: asDisplayText('Image'),
  render: () => <ImageDemo />,
};
