import type { ArticleId } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { t } from '#i18n';
import { createStyles, useTheme } from '#lib/styles';
import { Icon } from '#primitives/icon';
import { Pressable } from '#primitives/pressable';
import { useBookmarks } from '../model/store';

export type BookmarkToggleProps = Readonly<{ id: ArticleId }>;

const useStyles = createStyles(() => ({
  target: { width: SPACING.xxxl, height: SPACING.xxxl, alignItems: 'center', justifyContent: 'center' },
}));

/**
 * Keeps an article, or stops keeping it.
 *
 * The mark alone says which of the two states it is in — outline against solid, in the paper's own red once kept — so
 * the label that names the gesture is also the only thing a reader who cannot see it is told, and the only thing a
 * test can read: a platform symbol renders as nothing at all off a device.
 *
 * The target is a whole grid step square, well past what a finger needs, where the screen it copies draws one of about
 * twenty-nine points and asks the reader to aim.
 */
export function BookmarkToggle({ id }: BookmarkToggleProps): ReactNode {
  const styles = useStyles();
  const theme = useTheme();
  const kept = useBookmarks((state) => state.ids.includes(id));
  const toggle = useBookmarks((state) => state.toggle);
  return (
    <Pressable
      style={styles.target}
      label={t(kept ? 'bookmark.remove' : 'bookmark.add')}
      onPress={() => {
        toggle(id);
      }}
    >
      <Icon name={kept ? 'bookmarkKept' : 'bookmark'} tintColor={kept ? theme.primary : theme.textMuted} />
    </Pressable>
  );
}
