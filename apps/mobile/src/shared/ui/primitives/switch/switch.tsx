import type { DisplayText } from '@huma/contracts';
import type { ReactNode } from 'react';
import { Switch as NativeSwitch } from 'react-native';
import { useTheme } from '../../../lib/styles';
import { KNOB_WIDER_THAN_TRACK, knobRole } from './knob';

export type SwitchProps = Readonly<{
  value: boolean;
  onChange: (value: boolean) => void;
  label: DisplayText;
}>;

/**
 * The platform's own on-off control, in the paper's colours.
 *
 * A setting that is on or off has no shape of its own in a newspaper, and every reader already knows this one: it is
 * drawn by the system, announced by a screen reader as a switch with its state, and moves the way the rest of the
 * phone does. What the app decides is the two colours the track takes — a pair no table of styles can hold, a style
 * carrying one ground and not one per state — so they are read from the theme here, in the one place allowed to know
 * the control.
 *
 * The label is what it is announced by: the text beside it belongs to the row, not to the control, so the control
 * would otherwise be a nameless target under a finger that cannot see.
 *
 * The colours are the ones a control needs, not the ones a card needs, and it took two readings on an A065 to find
 * them. Drawn in `border` and `surface`, it measured 1.13 to 1 against the page: a control nobody could find. Given the knob the page's own colour, it measured 1.00 against the page: the
 * platform draws the knob wider than the track and paints it over the middle of the pill, so a knob the colour of the
 * page leaves a hole where it sits and a crescent where it does not. Both themes showed it; three of the four states
 * were a shape nobody would name a switch.
 *
 * So the track takes a value both pages are far from — the same one in either theme, a muted grey being too pale to be
 * told from a pale knob on a dark page — and the knob, where it is wider than the track, the colour the paper writes
 * in. Where it rides inside the track, as iOS draws it, it takes the white of every other switch on the phone:
 * `knob` says why, and which platform draws which. The adjacencies a reader needs are then held together by the
 * tokens: the track against the page in each state, the knob against each track, and the wide knob against the page,
 * which is the one that had vanished. What tells the states apart is the knob's side as much as the colour, which
 * keeps them apart for a reader who sees no red.
 */
export function Switch({ value, onChange, label }: SwitchProps): ReactNode {
  const theme = useTheme();
  return (
    <NativeSwitch
      value={value}
      onValueChange={onChange}
      accessibilityLabel={label}
      trackColor={{ false: theme.control, true: theme.primary }}
      thumbColor={theme[knobRole(KNOB_WIDER_THAN_TRACK)]}
      ios_backgroundColor={theme.control}
    />
  );
}
