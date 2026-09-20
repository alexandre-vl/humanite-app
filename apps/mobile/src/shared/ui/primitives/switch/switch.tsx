import type { DisplayText } from '@huma/contracts';
import type { ReactNode } from 'react';
import { Switch as NativeSwitch } from 'react-native';
import { useTheme } from '../../../lib/styles';

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
 * The colours are the ones a control needs, not the ones a card needs. Drawn in the border and the surface — the two
 * roles a rule and a sheet are drawn in — it measured 1.13 to 1 against the page in the light theme on an A065: a
 * control nobody could find, on the screen a reader opens because they cannot see well. Off, the track now takes the
 * colour muted text takes, which the themes already hold above three to one against their ground; the knob takes the
 * ground itself, so it reads against the track in both states. What tells the states apart is the knob's side as much
 * as the colour, which is what keeps them apart for a reader who sees no red.
 */
export function Switch({ value, onChange, label }: SwitchProps): ReactNode {
  const theme = useTheme();
  return (
    <NativeSwitch
      value={value}
      onValueChange={onChange}
      accessibilityLabel={label}
      trackColor={{ false: theme.textMuted, true: theme.primary }}
      thumbColor={theme.background}
      ios_backgroundColor={theme.textMuted}
    />
  );
}
