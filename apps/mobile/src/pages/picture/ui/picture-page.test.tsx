import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useViewingPicture } from '#features/view-picture';
import { t } from '#i18n';
import { renderWithCache } from '#lib/testing';
import { PicturePage } from './picture-page';

const redirected: string[] = [];
jest.mock('expo-router', () => {
  const target = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => children;
  const redirect = ({ href }: Readonly<{ href: string }>): ReactNode => {
    redirected.push(href);
    return null;
  };
  return {
    router: { back: jest.fn() },
    Link: { AppleZoomTarget: target },
    Redirect: redirect,
    usePreventZoomTransitionDismissal: jest.fn(),
  };
});

beforeEach(() => {
  useViewingPicture.getState().clear();
  redirected.length = 0;
  jest.mocked(router.back).mockClear();
});

describe('la page de la photographie', () => {
  it('revient à l’accueil si le lien ne désigne aucune photo', async () => {
    await renderWithCache(<PicturePage />);
    expect(redirected).toEqual(['/']);
  });

  it('ferme par la navigation et libère la photo quand la page disparaît', async () => {
    useViewingPicture.getState().open({ visual: { source: 1 }, frame: 'photo', recyclingKey: 'photo' });
    await renderWithCache(<PicturePage />);
    expect(screen.getByRole('image', { name: t('picture.label') })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t('picture.close') }));
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(useViewingPicture.getState().picture).not.toBeNull();
    await screen.unmount();
    expect(useViewingPicture.getState().picture).toBeNull();
  });
});
