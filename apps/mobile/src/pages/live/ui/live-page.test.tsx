import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { LivePage } from './live-page';

describe('LivePage', () => {
  it('affiche le libellé de la rubrique', async () => {
    await render(<LivePage />);
    expect(screen.getByText('En continu')).toBeTruthy();
  });
});
