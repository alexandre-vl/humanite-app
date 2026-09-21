import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { asDisplayText } from '../../../lib/display-text';
import { createStyles } from '../../../lib/styles';
import { Switch } from './switch';

const LABEL = 'Lisibilité renforcée';

const useRoles = createStyles((theme) => ({
  control: { backgroundColor: theme.control },
  primary: { backgroundColor: theme.primary },
  ink: { backgroundColor: theme.textPrimary },
}));

/**
 * The three theme roles the control is meant to be drawn in, painted beside it so a test can read them back.
 *
 * Naming a theme here would prove nothing about the other one, and the lint forbids it anyway; what the control owes
 * is that it takes these roles, whichever theme is in force. That the roles themselves hold — the five adjacencies a
 * reader needs to find the control and to see which way it is set — is measured in the tokens' own test, so the two
 * together are the whole of WCAG 1.4.11 for this control.
 */
function Roles(): ReactNode {
  const styles = useRoles();
  return (
    <View>
      <View testID="control" style={styles.control} />
      <View testID="primary" style={styles.primary} />
      <View testID="ink" style={styles.ink} />
    </View>
  );
}

/** A rendered view's style, flattened: React Native accepts an array of styles, and these probes each carry one. */
const flatten = (value: unknown): Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null ? { ...value } : {};

const roleColor = (testID: string): unknown => flatten(screen.getByTestId(testID).props['style'])['backgroundColor'];

describe('Switch', () => {
  it('se laisse trouver et annoncer par son étiquette, le texte de la ligne n’étant pas le sien', async () => {
    await render(<Switch value={false} onChange={() => undefined} label={asDisplayText(LABEL)} />);
    expect(screen.getByLabelText(LABEL)).toBeTruthy();
  });

  it('rapporte la valeur vers laquelle on le pousse, sans la tenir lui-même', async () => {
    const onChange = jest.fn<(value: boolean) => void>();
    await render(<Switch value={false} onChange={onChange} label={asDisplayText(LABEL)} />);
    await fireEvent(screen.getByLabelText(LABEL), 'valueChange', true);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  /**
   * Two defects this holds, both found on an A065 and measured there. Drawn in the roles of a rule and a sheet, the
   * control stood at 1,13 to 1 against the page: a control nobody could find. Given the page's own colour for its
   * knob, it stood at 1,00 against the page — and the platform draws the knob wider than the track, so three of the
   * four states were a hole and a crescent rather than a switch. Nothing in the chain saw either: the two tests above
   * pass whatever the control is painted in.
   */
  it('prend les rôles d’un contrôle, et non ceux d’un filet, d’une feuille ou de la page', async () => {
    await render(
      <>
        <Roles />
        <Switch value={false} onChange={() => undefined} label={asDisplayText(LABEL)} />
      </>,
    );
    // React Native spreads the pair of track colours and the knob into three props of its own before handing them to
    // the platform, so these are the names the control is actually drawn from, not the ones it was given.
    const control = screen.getByLabelText(LABEL);
    expect(control.props['tintColor']).toBe(roleColor('control'));
    expect(control.props['onTintColor']).toBe(roleColor('primary'));
    expect(control.props['thumbTintColor']).toBe(roleColor('ink'));
  });
});
