import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { useRef } from 'react';
import { t } from '#i18n';
import { DECORATIVE } from '#lib/announce';
import { createStyles, useTheme } from '#lib/styles';
import { Box } from '#primitives/box';
import { Icon } from '#primitives/icon';
import { Pressable } from '#primitives/pressable';
import { Progress } from '#primitives/progress';
import { TextField } from '#primitives/text-field';
import type { FieldHandle } from '#primitives/text-field';

export type SearchFieldProps = Readonly<{
  value: string;
  onChange: (text: string) => void;
  /** Whether the journal is still being asked, which the rule under the field says. */
  busy: boolean;
}>;

const useStyles = createStyles(() => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    // A floor and not a height. Forty-eight points is what a thumb is owed and what the line looks right at, but the
    // reader sets how large the paper prints and the question they type grows with it: a fixed height cropped the
    // ascenders and descenders off their own words at the largest setting.
    minHeight: SPACING.xxxl,
  },
  // The field is the whole line, and not only its letters: set at twenty points, the letters were the whole of the
  // target (iPhone simulator, 25/09/2026). So it stretches to the line's height, and the room that keeps the line
  // breathing at the smallest step — where the floor alone would have the text touching the rule underneath it — is
  // the field's own, inside the target rather than around it: left on the line, it held the field to forty points.
  input: { flex: 1, alignSelf: 'stretch', paddingVertical: SPACING.xs },
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
 *
 * Pressed, it empties the line and puts the caret back in it: clearing a question is making room for another. With the
 * keyboard put away — a list scrolled puts it away — the cross left an empty line and a second press to make on it.
 */
export function SearchField({ value, onChange, busy }: SearchFieldProps): ReactNode {
  const styles = useStyles();
  const theme = useTheme();
  const field = useRef<FieldHandle>(null);
  return (
    <Box>
      <Box style={styles.bar}>
        <Icon name="search" announces={DECORATIVE} size={SPACING.lg} tintColor={theme.primary} />
        <TextField
          ref={field}
          value={value}
          onChange={onChange}
          label={t('search.field')}
          placeholder={t('search.placeholder')}
          style={styles.input}
        />
        {value === '' ? null : (
          <Pressable
            hitSlop={REACH}
            label={t('search.clear')}
            role="button"
            onPress={() => {
              onChange('');
              field.current?.focus();
            }}
          >
            <Icon name="clear" announces={DECORATIVE} size={SPACING.lg} tintColor={theme.textMuted} />
          </Pressable>
        )}
      </Box>
      {/* While the journal looks, the rule is the one thing on the screen that says what is listed is not its answer
          yet, and a reader listening is told so in words. At rest it has nothing to add to the list under it. */}
      <Progress busy={busy} announces={busy ? t('search.asking') : DECORATIVE} />
    </Box>
  );
}
