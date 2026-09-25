import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { CataloguePage } from './catalogue-page';

const redirected: string[] = [];

jest.mock('expo-router', () => {
  const redirect = ({ href }: { href: string }): ReactNode => {
    redirected.push(href);
    return null;
  };
  return { __esModule: true, router: { back: jest.fn() }, Redirect: redirect };
});

/** Whether the build is one made for development, as the bundler would have fixed it. */
const building = (development: boolean): void => {
  Reflect.set(globalThis, '__DEV__', development);
};

afterEach(() => {
  building(true);
  redirected.length = 0;
});

describe('CataloguePage', () => {
  it('montre la galerie dans une build de développement', async () => {
    building(true);
    await render(<CataloguePage />);
    expect(screen.getByText('L0')).toBeTruthy();
    expect(redirected).toEqual([]);
  });

  it('ramène à la une dans une build faite pour les lecteurs', async () => {
    building(false);
    await render(<CataloguePage />);
    expect(screen.queryByText('L0')).toBeNull();
    expect(redirected).toEqual(['/']);
  });
});
