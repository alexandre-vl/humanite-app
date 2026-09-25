import type { Instant, SectionId } from '@huma/contracts';
import { instantAt, SECTION_ID } from '@huma/contracts';
import { describe, expect, it } from '@jest/globals';
import { content } from '#api';
import type { Reach, StreamPage } from './reach';
import { floorOf, nextStepOf, oldestOf, reachOf, targetOf } from './reach';

/** A Paris hour as the newsroom writes one, read as the instant it names. */
const paris = (stamp: string): Instant => {
  const instant = instantAt(stamp);
  if (instant === null) {
    throw new Error(`aucun instant ne s’écrit ${stamp}`);
  }
  return instant;
};

const HARD = SECTION_ID.parse('politique');
const STEADY = SECTION_ID.parse('monde');
const RARE = SECTION_ID.parse('histoire');

/** Where a section stands: the cursor its page left, and the oldest item it gave. */
const standing = (section: SectionId, next: string | null, oldest: string | null): Reach => ({
  section,
  next,
  oldest: oldest === null ? null : paris(oldest),
});

/** A step that read these sections, and brought back no item worth drawing. */
const step = (...reached: readonly Reach[]): StreamPage => ({ read: [], reached });

describe('floorOf', () => {
  /** The merge is whole down to the section that stopped highest: below it, that section may still hold something. */
  it('s’arrête au plus récent des plus anciens articles lus, rubrique par rubrique', () => {
    const reach = [
      standing(HARD, '30', '2026-09-23 14:00'),
      standing(STEADY, '30', '2026-09-21 09:00'),
      standing(RARE, '30', '2026-07-02 10:00'),
    ];
    expect(floorOf(reach)).toBe(paris('2026-09-23 14:00'));
  });

  it('ne compte ni une rubrique épuisée ni une rubrique qui n’a encore rien donné', () => {
    const reach = [
      standing(HARD, null, '2026-09-24 18:00'),
      standing(STEADY, '30', null),
      standing(RARE, '30', '2026-07-02 10:00'),
    ];
    expect(floorOf(reach)).toBe(paris('2026-07-02 10:00'));
  });

  it('ne retient rien quand plus aucune rubrique n’a de page à lire', () => {
    expect(floorOf([standing(HARD, null, '2026-09-24 18:00'), standing(STEADY, null, null)])).toBeNull();
  });
});

describe('reachOf', () => {
  /** A step reads only some sections: the others stand where the step before left them. */
  it('laisse chaque rubrique qu’un pas n’a pas lue là où le pas d’avant l’a laissée', () => {
    const reach = reachOf([
      step(standing(HARD, '30', '2026-09-23 14:00'), standing(STEADY, '30', '2026-09-21 09:00')),
      step(standing(HARD, '60', '2026-09-20 08:00')),
    ]);
    expect(reach).toEqual([standing(HARD, '60', '2026-09-20 08:00'), standing(STEADY, '30', '2026-09-21 09:00')]);
  });

  it('garde le plus ancien article qu’une rubrique a donné, quel que soit le pas', () => {
    const reach = reachOf([step(standing(HARD, '30', '2026-09-23 14:00')), step(standing(HARD, '60', null))]);
    expect(reach).toEqual([standing(HARD, '60', '2026-09-23 14:00')]);
  });
});

describe('targetOf', () => {
  it('vise le début de la journée du plancher, à Paris', () => {
    expect(targetOf(paris('2026-09-23 14:00'))).toBe(paris('2026-09-23 00:00'));
  });

  /** What is left of a day before noon is a third of what the newsroom files in it: the step takes the day before. */
  it('prend aussi la veille quand il ne reste de la journée que la matinée', () => {
    expect(targetOf(paris('2026-09-23 06:30'))).toBe(paris('2026-09-22 00:00'));
    expect(targetOf(paris('2026-09-23 11:59'))).toBe(paris('2026-09-22 00:00'));
    expect(targetOf(paris('2026-09-23 12:00'))).toBe(paris('2026-09-23 00:00'));
  });

  /** The newsroom's midnight moves with the hour: on the Sunday it changes, a day is twenty-five hours long. */
  it('suit le changement d’heure de Paris', () => {
    expect(targetOf(paris('2026-10-25 12:00'))).toBe(paris('2026-10-25 00:00'));
  });
});

describe('nextStepOf', () => {
  /**
   * The measured case: a section the newsroom runs hard reaches back a day on a page, one it runs rarely two months.
   * The second step asked the rarely-run one for the two months before that, and waited 11.3 seconds for it.
   */
  it('ne relit que les rubriques qui n’atteignent pas le début de la journée à compléter', () => {
    const next = nextStepOf([
      step(
        standing(HARD, '30', '2026-09-23 14:00'),
        standing(STEADY, '30', '2026-09-23 09:00'),
        standing(RARE, '30', '2026-07-02 10:00'),
      ),
    ]);
    expect(next).toEqual({
      wire: false,
      reads: [
        { section: HARD, cursor: '30' },
        { section: STEADY, cursor: '30' },
      ],
    });
  });

  it('relit une rubrique qui a une page à lire mais n’a encore rien donné', () => {
    const next = nextStepOf([step(standing(HARD, '30', '2026-09-23 14:00'), standing(STEADY, '30', null))]);
    expect(next?.reads.map((read) => read.section)).toEqual([HARD, STEADY]);
  });

  /** A section that gave nothing constrains no floor, and still has a page to read even when it is the last one. */
  it('relit une rubrique qui n’a encore rien donné, même quand elle est la seule à avoir une page à lire', () => {
    const next = nextStepOf([step(standing(HARD, null, '2026-09-23 14:00'), standing(STEADY, '30', null))]);
    expect(next).toEqual({ wire: false, reads: [{ section: STEADY, cursor: '30' }] });
  });

  it('ne demande plus rien quand toutes les rubriques sont épuisées', () => {
    expect(nextStepOf([step(standing(HARD, null, '2026-09-23 14:00'), standing(STEADY, null, null))])).toBeNull();
  });

  /** The wire's own route answers the newsroom's last few, and pages no further: it goes with the first step alone. */
  it('ne relit jamais la route du fil après le premier pas', () => {
    expect(nextStepOf([step(standing(HARD, '30', '2026-09-23 14:00'))])?.wire).toBe(false);
  });
});

describe('oldestOf', () => {
  it('rend le plus ancien des articles, ou rien quand il n’y en a pas', async () => {
    const { items } = await content.getFeed({ section: HARD });
    const oldest = [...items].sort((left, right) => left.publishedAt.localeCompare(right.publishedAt))[0];
    expect(oldestOf(items)).toBe(oldest?.publishedAt);
    expect(oldestOf([])).toBeNull();
  });
});
