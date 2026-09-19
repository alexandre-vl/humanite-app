import { SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { createStyles } from '../../../lib/styles';
import { TextField } from './text-field';

const useStyles = createStyles((theme) => ({
  demo: {
    height: SPACING.xxxl,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: SIZES.stroke,
    borderColor: theme.primary,
  },
}));

function TextFieldDemo(): ReactNode {
  const styles = useStyles();
  const [text, setText] = useState('');
  return (
    <TextField
      value={text}
      onChange={setText}
      placeholder={asDisplayText('Saisissez ici le sujet')}
      style={styles.demo}
    />
  );
}

export const catalog: CatalogEntry = {
  name: asDisplayText('TextField'),
  render: () => <TextFieldDemo />,
};
