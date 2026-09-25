import { describe, expect, test } from 'vitest';
import type { PhoneText } from './phone-text.ts';
import { phoneSize, TEXT_SIZE_CATEGORIES, UNMOVED_PHONE } from './phone-text.ts';

/** Every size the paper sets, from its smallest step of its finest print to its largest step of its largest title. */
const SIZES = [...Array.from({ length: 53 }).keys()].map((index) => 10 + index / 2);

/** Every text size of either system, smallest first: iOS's twelve, and the scales Android offers or bends at. */
const PHONES: readonly (readonly PhoneText[])[] = [
  TEXT_SIZE_CATEGORIES.map((category): PhoneText => ({ system: 'ios', category })),
  [0.85, 1, 1.05, 1.1, 1.15, 1.2, 1.3, 1.4, 1.5, 1.8, 2].map((scale): PhoneText => ({ system: 'android', scale })),
];

describe('phoneSize', () => {
  test('prints every size as it is set where the phone has not been touched', () => {
    for (const phone of [
      UNMOVED_PHONE,
      { system: 'ios', category: 'large' },
      { system: 'android', scale: 1 },
    ] as const) {
      for (const size of SIZES) {
        expect(phoneSize(size, phone)).toBeCloseTo(size, 9);
      }
    }
  });

  /**
   * What keeps a page a page at any size: a title never prints smaller than the text under it, and a reader who asks
   * for larger type never gets any size smaller than they had.
   */
  test('never prints a larger size smaller, nor any size smaller at a larger text size', () => {
    for (const system of PHONES) {
      system.forEach((phone, index) => {
        const smaller = system[index - 1];
        SIZES.forEach((size, at) => {
          const printed = phoneSize(size, phone);
          expect(printed).toBeGreaterThanOrEqual(phoneSize(SIZES[at - 1] ?? 0, phone));
          if (smaller !== undefined) {
            expect(printed).toBeGreaterThanOrEqual(phoneSize(size, smaller));
          }
        });
      });
    }
  });

  /** Three of the sizes read off the system, at both ends of the table and in its middle. */
  test('sets a size iOS has a style for where iOS sets that style', () => {
    expect(phoneSize(17, { system: 'ios', category: 'xSmall' })).toBe(14);
    expect(phoneSize(11, { system: 'ios', category: 'xxLarge' })).toBe(15);
    expect(phoneSize(34, { system: 'ios', category: 'ax5' })).toBe(60);
  });

  /**
   * Past its largest style iOS says nothing, and a size there goes on as the two largest go: at the largest text size
   * a title of 28 points prints at 58 and one of 34 at 60, so one of 40 prints at 62 — and not at 71, which is what
   * the largest style's own multiple would make of it. Android multiplies what lies past its last size by what that
   * size is multiplied by, which leaves 120 points at 120 at its largest scale.
   */
  test('grows a size past the tables as the tables end', () => {
    expect(phoneSize(40, { system: 'ios', category: 'ax5' })).toBeCloseTo(62, 9);
    expect(phoneSize(120, { system: 'android', scale: 2 })).toBeCloseTo(120, 9);
  });

  /**
   * The reason for the tables. At iOS's largest size a line of body text grows more than three times over and a
   * title less than twice; at Android's largest, twelve points double and thirty grow by a quarter.
   */
  test('grows large type less than small, as both systems do', () => {
    const largest: PhoneText = { system: 'ios', category: 'ax5' };
    expect(phoneSize(16, largest) / 16).toBeGreaterThan(3);
    expect(phoneSize(28, largest) / 28).toBeLessThan(2.1);
    expect(phoneSize(12, { system: 'android', scale: 2 })).toBe(24);
    expect(phoneSize(30, { system: 'android', scale: 2 })).toBe(38);
  });

  /** Android bends from 1.05 to 2, reads a scale between two of its tables between them, and multiplies elsewhere. */
  test('bends a size as Android does, between its tables and not past them', () => {
    expect(phoneSize(14, { system: 'android', scale: 1.4 })).toBeCloseTo((18.8 + 22) / 2, 9);
    expect(phoneSize(14, { system: 'android', scale: 1.03 })).toBeCloseTo(14 * 1.03, 9);
    expect(phoneSize(14, { system: 'android', scale: 2.2 })).toBeCloseTo(14 * 2.2, 9);
    expect(phoneSize(14, { system: 'android', scale: 1.149999976 })).toBeCloseTo(16.4, 9);
  });

  /**
   * Android files its tables by the hundredths of a 32-bit float, cut: the table written for 1.05 lands at 104. So a
   * scale of 1.04 already reads it, a scale between it and the next is placed from 1.04, and a scale just past 2 is
   * still filed with 2 and bent by its table.
   */
  test('finds a table where Android files it, and not where it is written', () => {
    expect(phoneSize(14, { system: 'android', scale: 1.04 })).toBeCloseTo(14.8, 9);
    expect(phoneSize(14, { system: 'android', scale: 1.05 })).toBeCloseTo(14.8, 9);
    expect(phoneSize(14, { system: 'android', scale: 1.07 })).toBeCloseTo((14.8 + 15.6) / 2, 5);
    expect(phoneSize(14, { system: 'android', scale: 2.007 })).toBeCloseTo(26, 9);
  });
});
