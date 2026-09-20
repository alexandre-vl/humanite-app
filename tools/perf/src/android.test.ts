import { describe, expect, it } from 'vitest';
import { displayOf, framesOf, startupOf } from './android.ts';

describe('startupOf', () => {
  it('lit la durée totale du lancement', () => {
    expect(startupOf('Status: ok\nTotalTime: 812\nWaitTime: 830\n')).toEqual({
      read: 'answered',
      value: { totalMs: 812 },
    });
  });

  /** A number on a line of its own is the only shape read: a `TotalTime` inside a sentence is not a measurement. */
  it('refuse une réponse où la ligne ne tient pas seule', () => {
    expect(startupOf('warning: TotalTime: unknown for this activity').read).toBe('unreadable');
  });

  it('porte ce qu’il a reçu quand il ne sait pas le lire', () => {
    const read = startupOf('Error: Activity not started');
    expect(read).toMatchObject({ read: 'unreadable', saw: 'Error: Activity not started' });
  });
});

describe('framesOf', () => {
  it('compte la part des images hors échéance depuis les deux lignes du relevé', () => {
    const output = 'Total frames rendered: 200\nJanky frames: 4 (2.00%)\n';
    expect(framesOf(output)).toEqual({ read: 'answered', value: { rendered: 200, janky: 4, jankyPercent: 2 } });
  });

  /**
   * A dump with no frames is what a package that never drew answers. Read as a zero it would be the best measurement
   * the app ever took, and nobody would go looking for it — so it is refused, not counted.
   */
  it('refuse un relevé qui ne compte aucune image', () => {
    expect(framesOf('Total frames rendered: 0\nJanky frames: 0 (0.00%)\n').read).toBe('unreadable');
  });

  it('refuse un relevé auquel il manque une des deux lignes', () => {
    expect(framesOf('Total frames rendered: 200\n').read).toBe('unreadable');
  });
});

describe('displayOf', () => {
  it('retient le mode le plus rapide que l’écran déclare', () => {
    const output = '1080 x 2400, 120.000 fps, supportedModes [{fps=120.000}, {fps=60.000}]';
    expect(displayOf(output)).toEqual({ read: 'answered', value: { hz: 120 } });
  });

  it('refuse une réponse sans aucun mode', () => {
    expect(displayOf('Display Devices: size=0').read).toBe('unreadable');
  });
});
