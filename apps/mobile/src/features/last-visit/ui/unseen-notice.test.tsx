import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { styleOf } from '#lib/testing';
import { UnseenNotice } from './unseen-notice';

describe('UnseenNotice', () => {
  it.each([
    [1, false, '1 nouvel article en continu'],
    [12, false, '12 nouveaux articles en continu'],
    [30, true, 'Au moins 30 nouveaux articles en continu'],
  ])('dit %i article(s), minimum %s, par « %s »', async (count, atLeast, words) => {
    await render(<UnseenNotice unseen={{ count, atLeast }} onPress={jest.fn()} />);
    expect(screen.getByText(words)).toBeTruthy();
  });

  /** It opens another screen, so it is a link, and a reader listening hears where it leads by its words alone. */
  it('mène au fil, annoncée comme un lien qui dit ce qu’il tient', async () => {
    const onPress = jest.fn();
    await render(<UnseenNotice unseen={{ count: 12, atLeast: false }} onPress={onPress} />);
    await fireEvent.press(screen.getByRole('link', { name: '12 nouveaux articles en continu' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  /**
   * At the phone's largest text the pill ran 418 points wide off a 402-point screen, its chevron with it: in a row
   * nothing gives way unless told to. The words do, and wrap; the marks either side of them keep their size.
   */
  it('fait céder ses mots, et non ses marques, quand la place manque', async () => {
    await render(<UnseenNotice unseen={{ count: 12, atLeast: false }} onPress={jest.fn()} />);
    const words = screen.getByText('12 nouveaux articles en continu').parent;
    if (words === null) {
      throw new Error('les mots de la pastille ne sont posés dans rien : le test ne vérifierait rien');
    }
    expect(styleOf(words)['flexShrink']).toBe(1);
  });
});
