import type { ArticleId } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { t } from '#i18n';
import { DECORATIVE } from '#lib/announce';
import { createStyles, useTheme } from '#lib/styles';
import { Icon } from '#primitives/icon';
import { Pressable } from '#primitives/pressable';
import { useBookmarks } from '../model/store';

export type BookmarkToggleProps = Readonly<{ id: ArticleId }>;

const useStyles = createStyles(() => ({
  target: { width: SPACING.xl, height: SPACING.xl, alignItems: 'center', justifyContent: 'center' },
}));

/** What the target answers past its own edges, which brings a finger's whole grid step back around the mark. */
const REACH = SPACING.md;

/**
 * Keeps an article, or stops keeping it.
 *
 * The mark alone says which of the two states it is in — outline against solid, in the paper's own red once kept — so
 * the label that names the gesture is also the only thing a reader who cannot see it is told, and the only thing a
 * test can read: a platform symbol renders as nothing at all off a device.
 *
 * The mark takes the room a mark takes, and the finger is given its whole grid step around it rather than inside it.
 * Drawn at the size of the touch, it made the line it hangs on as tall as a finger — and on a screen where that line
 * carries nothing else, a card opened on forty-eight points of empty page with one bookmark floating at the end.
 * The screen this copies draws a target of about twenty-nine points and asks the reader to aim; this one is reachable
 * over forty-eight and visible over twenty-four.
 */
export function BookmarkToggle({ id }: BookmarkToggleProps): ReactNode {
  const styles = useStyles();
  const theme = useTheme();
  const kept = useBookmarks((state) => state.ids.includes(id));
  const toggle = useBookmarks((state) => state.toggle);
  return (
    <Pressable
      style={styles.target}
      hitSlop={REACH}
      label={t(kept ? 'bookmark.remove' : 'bookmark.add')}
      role="button"
      onPress={() => {
        toggle(id);
      }}
    >
      <Icon
        name={kept ? 'bookmarkKept' : 'bookmark'}
        announces={DECORATIVE}
        tintColor={kept ? theme.primary : theme.textMuted}
      />
    </Pressable>
  );
}
