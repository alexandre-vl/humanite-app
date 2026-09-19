import { describe, expect, it } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { List } from './list';

describe('List', () => {
  it('renders an item for each entry, under the header and the sticky band', async () => {
    await render(
      <List
        items={['un', 'deux']}
        keyOf={(item) => item}
        renderItem={(item) => <View testID={item} />}
        header={<View testID="header" />}
        sticky={<View testID="sticky" />}
      />,
    );
    // A virtualised list reports its first layout after the render returns; flushing keeps that update inside act.
    await act(async () => Promise.resolve());
    expect(screen.getByTestId('header')).toBeTruthy();
    expect(screen.getByTestId('sticky')).toBeTruthy();
    expect(await screen.findByTestId('un')).toBeTruthy();
    expect(await screen.findByTestId('deux')).toBeTruthy();
  });

  it('shows what stands in when it holds nothing', async () => {
    await render(
      <List
        items={[]}
        keyOf={(item: string) => item}
        renderItem={(item) => <View testID={item} />}
        empty={<View testID="empty" />}
      />,
    );
    expect(await screen.findByTestId('empty')).toBeTruthy();
  });
});
