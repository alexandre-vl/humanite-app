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
  /**
   * The phone this was written against lists three modes, the fastest at a hundred and twenty, and renders the app
   * at ninety. Reading the panel's best instead of the rate in force would file every measurement under a rate the
   * app never saw — which is what the first version of this reader did, until a real dump was looked at.
   */
  it('retient la fréquence en vigueur, pas la meilleure dont l’écran est capable', () => {
    const output = [
      '  mSupportedRefreshRates=[120.00001, 90.0, 60.000004]',
      '      DisplayMode{id=0, peakRefreshRate=120.00001, vsyncRate=120.00001}',
      '    mActiveRenderFrameRate=90.0',
      '      DisplayModeRecord{mMode={id=1, fps=120.00001, vsync=120.00001}}',
    ].join('\n');
    expect(displayOf(output)).toEqual({ read: 'answered', value: { hz: 90 } });
  });

  it('se rabat sur ce que l’écran s’est vu offrir quand la fréquence en vigueur manque', () => {
    expect(displayOf('DisplayDeviceInfo{1080 x 2412, modeId 2, renderFrameRate 60.0}')).toEqual({
      read: 'answered',
      value: { hz: 60 },
    });
  });

  it('refuse une réponse sans aucune fréquence', () => {
    expect(displayOf('Display Devices: size=0').read).toBe('unreadable');
  });
});
