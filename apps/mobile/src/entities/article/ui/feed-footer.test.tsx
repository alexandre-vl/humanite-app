import { CONTENT_ERROR_CODE, instantAt } from '@huma/contracts';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { canRetry } from '#api';
import { t } from '#i18n';
import { FeedFooter } from './feed-footer';
import { failureWords } from './feed-stand-in';

describe('FeedFooter', () => {
  it('ne pose rien sous un fil qui n’attend rien', async () => {
    await render(<FeedFooter foot={{ kind: 'none' }} onRetry={jest.fn()} />);
    expect(screen.toJSON()).toBeNull();
  });

  /** The wire is read a day at a time: the foot names the day on its way, as a sentence says it, weekday first. */
  it('nomme la journée en route, dans le corps de la phrase', async () => {
    await render(<FeedFooter foot={{ kind: 'coming', day: instantAt('2026-09-24 00:00') }} onRetry={jest.fn()} />);
    expect(screen.getByText('Chargement du jeudi 24\u00A0septembre\u00A0…')).toBeTruthy();
  });

  it('dit que la suite vient quand le fil n’a pas de journée à nommer', async () => {
    await render(<FeedFooter foot={{ kind: 'coming', day: null }} onRetry={jest.fn()} />);
    expect(screen.getByText(t('feed.more'))).toBeTruthy();
  });

  /** The words say the wait: the rule under them is for the eye, and a reader listening would hear it twice. */
  it('laisse les mots dire l’attente, et tait le trait qui la montre', async () => {
    await render(<FeedFooter foot={{ kind: 'coming', day: null }} onRetry={jest.fn()} />);
    expect(screen.queryByRole('image')).toBeNull();
    expect(screen.getByText(t('feed.more'))).toBeTruthy();
  });

  /**
   * A part that failed left the reader at the last item, the list asking again only once it had grown. The foot says
   * why in the words every feed uses for that cause, and offers another try exactly where one could answer otherwise.
   */
  it.each(CONTENT_ERROR_CODE.options)(
    'dit « %s » par ses propres mots, et n’offre un essai que s’il peut aboutir',
    async (failure) => {
      const onRetry = jest.fn();
      await render(<FeedFooter foot={{ kind: 'failed', failure }} onRetry={onRetry} />);
      expect(screen.getByText(failureWords(failure).title)).toBeTruthy();
      const retry = screen.queryByText(t('action.retry'));
      expect(retry !== null).toBe(canRetry(failure));
      if (retry !== null) {
        await fireEvent.press(retry);
        expect(onRetry).toHaveBeenCalledTimes(1);
      }
    },
  );
});
