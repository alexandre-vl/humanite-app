import { ContentApiError } from '@huma/contracts';
import { describe, expect, it } from '@jest/globals';
import { stateOf } from './paged-feed';

describe('stateOf', () => {
  it('fait d’une lecture réussie sans article une étagère vide, et non un chargement', () => {
    expect(stateOf('success', null)).toEqual({ kind: 'empty' });
  });

  it('distingue ce qui n’a pas répondu de ce qui a échoué, et nomme la cause de l’échec', () => {
    expect(stateOf('pending', null)).toEqual({ kind: 'pending' });
    expect(stateOf('error', new ContentApiError('offline', 'hors ligne'))).toEqual({
      kind: 'failed',
      failure: 'offline',
    });
  });

  /** An error nobody named is a read that could not be made into an answer, which is what `malformed` says. */
  it('range une erreur que le contenu n’a pas nommée sous une réponse illisible', () => {
    expect(stateOf('error', new TypeError('x is undefined'))).toEqual({ kind: 'failed', failure: 'malformed' });
  });
});
