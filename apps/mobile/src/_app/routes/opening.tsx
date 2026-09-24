import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { t } from '#i18n';
import { createStyles } from '#lib/styles';
import { Curtain } from '#primitives/curtain';
import { Text } from '#primitives/text';

const useStyles = createStyles((theme) => ({
  field: {
    position: 'absolute',
    top: SPACING.none,
    bottom: SPACING.none,
    left: SPACING.none,
    right: SPACING.none,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.background,
  },
}));

/**
 * The shortest the opening is held, counted from the handover — which is not the same as the shortest it is *seen*,
 * and the difference is the platform's.
 *
 * What the reader must get is a quarter of a second of masthead standing still. Under that it reads as a fault of
 * the screen rather than as an opening: at 130 ms the recording shows a blink, at 60 ms a dropped frame.
 *
 * The phone answers the ask to hide its own field before that field is off the screen, because Android runs the
 * splash out on an animation of its own that nothing in JS is told the end of. Recorded at 30 images per second on
 * 24/09/2026, that answer came 180, 270 and 350 ms early over three cold launches. There is no signal for « the
 * reader can see this », so the floor carries the worst of those on top of the quarter second it owes, and a phone
 * that hands over faster is given a longer opening rather than a shorter one.
 *
 * What that comes to, recorded the same way on two cold launches at this floor: 366 ms of masthead standing still on
 * the paper, then 230 ms of it going. The number is empirical and it is a dev client's: a production build is owed
 * its own recording.
 *
 * Against the launch itself, measured at 1 203 to 1 765 ms on the same day: about half of this is spent covering a
 * start that was happening anyway, and the rest is added. The rise that follows is over a front page already laid
 * out, and a finger going through it reaches the page.
 */
const SHOWN_AT_LEAST = 650;

/**
 * Whether the opening has been *on screen* at least as long as it owes the reader — which is not the same as having
 * been mounted that long, and the difference is most of a second.
 *
 * The app paints behind the phone's own field, which is taken away on its own schedule: recorded at 30 images per
 * second on 24/09/2026, React committed this subtree at 4,83 s and the first pixel of it reached the screen at 5,47 s.
 * A floor counted from the mount had therefore run out 60 ms after the reader first saw the masthead, and what the
 * recording shows is a flicker. Counted from the handover it is the reader's own screen being measured.
 */
const useHeldLongEnough = (shown: boolean): boolean => {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!shown) {
      return undefined;
    }
    const door = setTimeout(() => {
      setHeld(true);
    }, SHOWN_AT_LEAST);
    return () => {
      clearTimeout(door);
    };
  }, [shown]);
  return held;
};

export type OpeningProps = Readonly<{
  /** Whether the phone has given the screen up: its own field is gone and this is what the reader is looking at. */
  shown: boolean;
  /** Whether the page underneath is laid out and worth uncovering. */
  ready: boolean;
}>;

/**
 * What the app opens on: the paper's ground, with the paper's name on it, until the first page is laid out under it.
 *
 * The phone paints the same ground before a line of this app has run — the splash is declared as that colour and
 * nothing else — so the masthead does not arrive on a screen of its own. It arrives on the screen that is already
 * there, and leaves it the same way. Between a cold launch and the front page there is one continuous field of
 * paper, which is the only thing a reader should be able to describe afterwards.
 *
 * It is drawn in the app's own letters rather than shipped as a picture. The journal's name is set in the face the
 * app loads for its headlines, and a rendering of it kept beside that face is a second drawing of the same words —
 * out of step with the first on whichever day one of the two changes.
 */
export function Opening({ shown, ready }: OpeningProps): ReactNode {
  const styles = useStyles();
  const heldLongEnough = useHeldLongEnough(shown);
  return (
    <Curtain style={styles.field} lifted={ready && heldLongEnough}>
      <Text variant="masthead">{t('app.name')}</Text>
    </Curtain>
  );
}
