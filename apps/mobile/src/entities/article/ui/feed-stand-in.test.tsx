import { CONTENT_ERROR_CODE } from '@huma/contracts';
import type { ContentErrorCode } from '@huma/contracts';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { canRetry } from '#api';
import { t } from '#i18n';
import { FeedStandIn, failureWords } from './feed-stand-in';

const failed = (failure: ContentErrorCode) => ({ kind: 'failed', failure }) as const;

describe('FeedStandIn', () => {
  it('nomme la cause d’un échec, et offre un nouvel essai quand il peut aboutir', async () => {
    const onRetry = jest.fn();
    await render(<FeedStandIn state={failed('offline')} onRetry={onRetry} />);
    expect(screen.getByText('Pas de connexion')).toBeTruthy();
    await fireEvent.press(screen.getByText(t('action.retry')));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  /**
   * A button that can only fail again is a button that lies: what the source lacks or refuses it lacks next time too.
   * Every cause is rendered, and the button is there exactly where the door says asking again could answer otherwise.
   */
  it.each(CONTENT_ERROR_CODE.options)(
    'dit « %s » par ses propres mots, et n’offre un essai que s’il peut aboutir',
    async (failure) => {
      await render(<FeedStandIn state={failed(failure)} onRetry={jest.fn()} />);
      expect(screen.getByText(failureWords(failure).title)).toBeTruthy();
      expect(screen.queryByText(t('action.retry')) !== null).toBe(canRetry(failure));
    },
  );

  /** Six causes, six things said: two that read alike would leave a reader unable to tell what to do about either. */
  it('ne dit pas deux causes dans les mêmes mots', () => {
    const titles = CONTENT_ERROR_CODE.options.map((failure) => failureWords(failure).title);
    expect(new Set(titles).size).toBe(CONTENT_ERROR_CODE.options.length);
  });

  it('dit l’étagère vide dans les mots de l’écran quand il en donne', async () => {
    const empty = { title: t('newsstand.empty.title'), message: t('newsstand.empty.message') };
    await render(<FeedStandIn state={{ kind: 'empty' }} onRetry={jest.fn()} empty={empty} />);
    expect(screen.getByText('Le kiosque est vide')).toBeTruthy();
  });
});
