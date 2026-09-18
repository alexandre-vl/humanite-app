import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ErrorBoundary } from './error-boundary';

describe('ErrorBoundary', () => {
  it('rend la main à Expo Router quand on demande à réessayer', async () => {
    const retry = jest.fn(async (): Promise<void> => Promise.resolve());
    await render(<ErrorBoundary error={new Error('rendu impossible')} retry={retry} />);
    await fireEvent.press(screen.getByText('Réessayer'));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
