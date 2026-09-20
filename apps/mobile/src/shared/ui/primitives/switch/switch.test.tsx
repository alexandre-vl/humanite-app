import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { asDisplayText } from '../../../lib/display-text';
import { Switch } from './switch';

const LABEL = 'Lisibilité renforcée';

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
});
