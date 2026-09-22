import { describe, expect, test } from 'vitest';
import { displayOf, framesOf, startupOf } from './android.ts';

describe('startupOf', () => {
  test('reads the total time of a launch', () => {
    expect(startupOf('Status: ok\nTotalTime: 812\nWaitTime: 830\n')).toEqual({
      read: 'answered',
      value: { totalMs: 812 },
    });
  });

  /** A number on a line of its own is the only shape read: a `TotalTime` inside a sentence is not a measurement. */
  test('refuses an answer where the line does not stand on its own', () => {
    expect(startupOf('warning: TotalTime: unknown for this activity').read).toBe('unreadable');
  });

  test('carries what it was given when it cannot read it', () => {
    const read = startupOf('Error: Activity not started');
    expect(read).toMatchObject({ read: 'unreadable', saw: 'Error: Activity not started' });
  });
});

describe('framesOf', () => {
  test('counts the share of late frames from the two lines of the report', () => {
    const output = 'Total frames rendered: 200\nJanky frames: 4 (2.00%)\n';
    expect(framesOf(output)).toEqual({ read: 'answered', value: { rendered: 200, janky: 4, jankyPercent: 2 } });
  });

  /**
   * A dump with no frames is what a package that never drew answers. Read as a zero it would be the best measurement
   * the app ever took, and nobody would go looking for it — so it is refused, not counted.
   */
  test('refuses a report that counts no frame', () => {
    expect(framesOf('Total frames rendered: 0\nJanky frames: 0 (0.00%)\n').read).toBe('unreadable');
  });

  test('refuses a report missing one of its two lines', () => {
    expect(framesOf('Total frames rendered: 200\n').read).toBe('unreadable');
  });
});

describe('displayOf', () => {
  /**
   * The phone this was written against lists three modes, the fastest at a hundred and twenty, and renders the app
   * at ninety. Reading the panel's best instead of the rate in force would file every measurement under a rate the
   * app never saw — which is what the first version of this reader did, until a real dump was looked at.
   */
  test('keeps the refresh rate in force, not the best the screen is capable of', () => {
    const output = [
      '  mSupportedRefreshRates=[120.00001, 90.0, 60.000004]',
      '      DisplayMode{id=0, peakRefreshRate=120.00001, vsyncRate=120.00001}',
      '    mActiveRenderFrameRate=90.0',
      '      DisplayModeRecord{mMode={id=1, fps=120.00001, vsync=120.00001}}',
    ].join('\n');
    expect(displayOf(output)).toEqual({ read: 'answered', value: { hz: 90 } });
  });

  test('falls back on what the screen was offered when the rate in force is missing', () => {
    expect(displayOf('DisplayDeviceInfo{1080 x 2412, modeId 2, renderFrameRate 60.0}')).toEqual({
      read: 'answered',
      value: { hz: 60 },
    });
  });

  test('refuses an answer with no refresh rate at all', () => {
    expect(displayOf('Display Devices: size=0').read).toBe('unreadable');
  });
});
