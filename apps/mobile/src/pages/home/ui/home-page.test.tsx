import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { StartupProvider } from '#lib/startup';
import { HomePage } from './home-page';

describe('HomePage', () => {
  it('renders the masthead and the section bar', async () => {
    await render(
      <StartupProvider>
        <HomePage />
      </StartupProvider>,
    );
    expect(screen.getByText('Humanité')).toBeTruthy();
    expect(screen.getByText('À la une')).toBeTruthy();
  });
});
