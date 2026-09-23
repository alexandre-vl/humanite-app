import { SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { t } from '#i18n';
import { DECORATIVE } from '#lib/announce';
import { createStyles, useTheme } from '#lib/styles';
import { Box } from '#primitives/box';
import { Icon } from '#primitives/icon';
import { Pressable } from '#primitives/pressable';
import { TextField } from '#primitives/text-field';

export type SearchFieldProps = Readonly<{ value: string; onChange: (text: string) => void }>;

const useStyles = createStyles((theme) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    height: SPACING.xxxl,
    borderBottomWidth: SIZES.stroke,
    borderColor: theme.primary,
  },
  input: { flex: 1 },
}));

/**
 * What the cross answers past its own edges. The mark is sixteen points, and it was the whole of the target: 42 pixels
 * of an A065 under a thumb that wants 126. Sixteen more on every side is the grid step a finger is owed, and it stays
 * inside the line the cross sits on — that line is a grid step tall, and the screen's margin is sixteen points — which
 * is as far as a reach goes: React Native hands a child no touch past the edges of its parent.
 */
const REACH = SPACING.lg;

/**
 * The field a reader puts a question in: a magnifier saying what it is for, the line being typed, and a cross to take
 * it back. It is underlined rather than boxed, which is how the paper draws it.
 *
 * The magnifier and the cross are the screen's, not the paper's — the screen it copies has neither. The first because
 * nothing else on a blank screen says what the line is for once the tab bar is out of sight; the second because a
 * search that answers as you type is one a reader must be able to stop, and backspacing twenty times is not stopping.
 * The cross appears only when there is something to clear, and is announced by its label, having nothing to read out.
 */
export function SearchField({ value, onChange }: SearchFieldProps): ReactNode {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Box style={styles.bar}>
      <Icon name="search" announces={DECORATIVE} size={SPACING.lg} tintColor={theme.primary} />
      <TextField value={value} onChange={onChange} placeholder={t('search.placeholder')} style={styles.input} />
      {value === '' ? null : (
        <Pressable
          hitSlop={REACH}
          label={t('search.clear')}
          role="button"
          onPress={() => {
            onChange('');
          }}
        >
          <Icon name="clear" announces={DECORATIVE} size={SPACING.lg} tintColor={theme.textMuted} />
        </Pressable>
      )}
    </Box>
  );
}
