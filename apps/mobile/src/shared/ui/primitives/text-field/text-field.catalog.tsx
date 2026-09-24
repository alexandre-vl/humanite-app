import { SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { createStyles } from '../../../lib/styles';
import { TextField } from './text-field';

const useStyles = createStyles((theme) => ({
  demo: {
    // A floor, as the search field has one: the reader sets how large the paper prints, and a demo that cropped the
    // words it is demonstrating would be showing the wrong thing at the largest setting.
    minHeight: SPACING.xxxl,
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderBottomWidth: SIZES.stroke,
    borderColor: theme.primary,
  },
}));

function TextFieldDemo(): ReactNode {
  const styles = useStyles();
  const [text, setText] = useState('');
  return (
    <TextField value={text} onChange={setText} placeholder={asDisplayText('Un champ où écrire')} style={styles.demo} />
  );
}

export const catalog: CatalogEntry = {
  name: asDisplayText('TextField'),
  render: () => <TextFieldDemo />,
};
