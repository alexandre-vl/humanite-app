import type { DisplayText } from '@huma/contracts';

/**
 * What a picture or a symbol tells a reader who is listening to the paper rather than looking at it.
 *
 * A screen reader walks the tree and stops on whatever says it is worth stopping on. A picture that repeats the
 * headline beside it is a second stop for the same fact; a picture that carries something the words do not is the
 * only place that fact exists. Nothing in a type can tell the two apart, so the question is asked every time and
 * cannot be skipped — the same reason `recyclingKey` is required of an image and not inferred.
 *
 * `decorative` is not a silence: it is a view saying it has nothing of its own to add, which is what lets the reader
 * hear the headline once instead of twice.
 */
export const DECORATIVE = 'decorative';

/** A name to read out, or the word that says this view is there for the eye alone. */
export type Announcement = DisplayText | typeof DECORATIVE;

/**
 * The accessibility props a view carries so it is read out by that name, or walked past entirely.
 *
 * Both platforms are answered, because they ask differently: iOS takes a view out of the walk with
 * `accessibilityElementsHidden`, Android with `importantForAccessibility`, and a view that answered only one of them
 * would be announced on one phone and not on the other with nothing to report it.
 */
export type Announced = Readonly<{
  accessible: boolean;
  accessibilityRole?: 'image';
  accessibilityLabel?: DisplayText;
  accessibilityElementsHidden: boolean;
  importantForAccessibility: 'yes' | 'no-hide-descendants';
}>;

/** How a view is announced, given what it has to say. */
export const announcedAs = (announcement: Announcement): Announced =>
  announcement === DECORATIVE
    ? { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' }
    : {
        accessible: true,
        accessibilityRole: 'image',
        accessibilityLabel: announcement,
        accessibilityElementsHidden: false,
        importantForAccessibility: 'yes',
      };
