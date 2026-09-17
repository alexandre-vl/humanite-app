import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { CollapsibleHeader } from './collapsible-header';

describe('CollapsibleHeader', () => {
  it('renders the header band, the sticky band and the scrolling children', async () => {
    await render(
      <CollapsibleHeader header={<View testID="header" />} sticky={<View testID="sticky" />}>
        <View testID="feed" />
      </CollapsibleHeader>,
    );
    expect(screen.getByTestId('header')).toBeTruthy();
    expect(screen.getByTestId('sticky')).toBeTruthy();
    expect(screen.getByTestId('feed')).toBeTruthy();
  });
});
