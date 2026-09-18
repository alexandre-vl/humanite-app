import { SIZES } from '@huma/design-tokens';
import { catalogLabel } from '../../../lib/catalogue';
import type { CatalogEntry } from '../../../lib/catalogue';
import { createStyles } from '../../../lib/styles';
import { Image } from './image';

// A BlurHash literal: a real image surface with no network fetch and no bundled binary.
const DEMO = 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4';

const styles = createStyles({ demo: { width: SIZES.headerExpanded, height: SIZES.headerExpanded } });

export const catalog: CatalogEntry = {
  name: catalogLabel('Image'),
  render: () => <Image source={{ blurhash: DEMO }} style={styles.demo} />,
};
