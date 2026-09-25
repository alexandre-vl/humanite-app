import type { FaceSet, PhoneText, TextScale, TextSizeCategory } from '@huma/design-tokens';
import { TEXT_SIZE_CATEGORIES } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { TypesettingProvider } from '../../../lib/styles';

export type TypesettingRootProps = Readonly<{ scale: TextScale; faces: FaceSet; children: ReactNode }>;

/**
 * The multiple React Native reports for each of iOS's text sizes (`RCTFontSizeMultiplier`, React/Base/RCTUtils.mm).
 * It is one number for a size that iOS applies as a table, so it is read back into the size it stands for.
 */
const IOS_MULTIPLES: Readonly<Record<TextSizeCategory, number>> = {
  xSmall: 0.823,
  small: 0.882,
  medium: 0.941,
  large: 1,
  xLarge: 1.118,
  xxLarge: 1.235,
  xxxLarge: 1.353,
  ax1: 1.786,
  ax2: 2.143,
  ax3: 2.643,
  ax4: 3.143,
  ax5: 3.571,
};

/** The first Android that bends its text sizes instead of multiplying them: Android 14. */
const BENDING_ANDROID = 34;

/** The iOS text size a multiple stands for: the one whose multiple it is, or the nearest one. */
const categoryOf = (fontScale: number): TextSizeCategory =>
  TEXT_SIZE_CATEGORIES.reduce((nearest, category) =>
    Math.abs(IOS_MULTIPLES[category] - fontScale) < Math.abs(IOS_MULTIPLES[nearest] - fontScale) ? category : nearest,
  );

/** The phone's text size, named as the system that grows it would name it. */
const phoneText = (fontScale: number): PhoneText => {
  if (Platform.OS === 'ios') {
    return { system: 'ios', category: categoryOf(fontScale) };
  }
  if (Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= BENDING_ANDROID) {
    return { system: 'android', scale: fontScale };
  }
  return { system: 'linear', scale: fontScale };
};

/**
 * Sets the type the reader asked for, at the text size their phone is set to: the only reader of that size.
 *
 * iOS and Android let a reader choose one text size for every app, and the paper has always followed it. The platform
 * used to apply it, growing every text it draws, but it grows them out of React's sight: a size changed while the app
 * ran was drawn at the new size in boxes laid out for the old one, and stayed so until the app was started again — on
 * the iPhone simulator on 25/09/2026, a heading of two lines at the largest size kept its 140 points of height at the
 * default one, its words floating in the middle. React Native does try to lay its texts out again when the size
 * changes, and the next render of anything undoes it: its tree is laid out from the nodes React holds, which never
 * heard of the change.
 *
 * So the size is read here and carried into every style with the reader's step, and the platform is told not to scale
 * a second time. When the phone's setting moves, the typesetting changes, every text is set again, and each is laid
 * out again at its new size — five changes in a row, each measured right on the simulator.
 *
 * What is carried is the size as the phone's own system names it, and not the multiple React Native reports: iOS grows
 * each size by a table and Android 14 bends its multiple, both so that large type grows less than small, and a single
 * multiple applied to every size had the paper's headlines grow as much as its body text.
 *
 * The choices come down as props, as the theme's does, because where the reader's settings are kept is not a
 * primitive's to know.
 */
export function TypesettingRoot({ scale, faces, children }: TypesettingRootProps): ReactNode {
  const { fontScale } = useWindowDimensions();
  // Held between renders: every text in the app reads this, and the window reports more than the text size — a new
  // value on each report would set every text again for a rotation that changed none of them.
  const typesetting = useMemo(() => ({ scale, faces, phone: phoneText(fontScale) }), [scale, faces, fontScale]);
  return <TypesettingProvider typesetting={typesetting}>{children}</TypesettingProvider>;
}
