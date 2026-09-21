import type { ArticleId } from '@huma/contracts';
import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { t } from '#i18n';
import { DECORATIVE } from '#lib/announce';
import { createStyles, useTheme } from '#lib/styles';
import { Icon } from '#primitives/icon';
import { Pressable } from '#primitives/pressable';
import { useBookmarks } from '../model/store';

export type BookmarkToggleProps = Readonly<{ id: ArticleId }>;

const useStyles = createStyles((theme) => ({
  target: {
    width: SPACING.xxl,
    height: SPACING.xxl,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The same box, filled. It is spelt out twice rather than laid over the first, a style being one handle and not a
  // list: what a primitive is given is the whole of what it draws.
  kept: {
    width: SPACING.xxl,
    height: SPACING.xxl,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
  },
}));

/** What the target answers past its own edges, which brings a finger's whole grid step back around the mark. */
const REACH = SPACING.sm;

/**
 * Keeps an article, or stops keeping it.
 *
 * The two states were told apart by the colour of the mark alone, and nothing else: on Android both of them draw the
 * same outline, the symbol font being a FILL 0 instance in which `bookmark` and `bookmark_border` are one glyph under
 * two names (see the icon registry, where the measurement is). So a reader who does not separate the paper's red from
 * the muted grey — and at 0.148 against 0.224 of relative luminance, the two differ by 1.38 to 1 in lightness alone —
 * was being told which state the mark was in by hue and by nothing else, which is what WCAG 1.4.1 is about.
 *
 * So the fill moves from the mark to what the mark sits on: kept, the target is a disc of the paper's red carrying a
 * white mark; not kept, it is the outline on the page and no disc at all. That is Material's own toggle — an
 * unselected icon button has no container and a selected one is filled — and it is two differences rather than one,
 * a ground appearing where there was none and the ink turning over with it. Both readings clear the three to one that
 * 1.4.11 asks of a shape: the red on the page and the white on the red each measure 3.83.
 *
 * The mark takes the room a mark takes, and the finger is given its whole grid step around it rather than inside it.
 * Drawn at the size of the touch, it made the line it hangs on as tall as a finger — and on a screen where that line
 * carries nothing else, a card opened on forty-eight points of empty page with one bookmark floating at the end.
 * The disc is a third of a grid step wider than the mark it holds, and reachable over forty-eight all the same.
 */
export function BookmarkToggle({ id }: BookmarkToggleProps): ReactNode {
  const styles = useStyles();
  const theme = useTheme();
  const kept = useBookmarks((state) => state.ids.includes(id));
  const toggle = useBookmarks((state) => state.toggle);
  return (
    <Pressable
      style={kept ? styles.kept : styles.target}
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
        tintColor={kept ? theme.onPrimary : theme.textMuted}
      />
    </Pressable>
  );
}
