import type { ArticleSummary, Instant, SectionId } from '@huma/contracts';
import { instantAt, instantOf, issueIdAt } from '@huma/contracts';

/**
 * Where one section's reading has got to: the cursor of the page after the last one read — none once the section has
 * run out — and the oldest item read of it so far, none while it has given nothing.
 */
export type Reach = Readonly<{ section: SectionId; next: string | null; oldest: Instant | null }>;

/** What one step over the whole paper brings back: everything it read, and where each section it read now stands. */
export type StreamPage = Readonly<{ read: readonly ArticleSummary[]; reached: readonly Reach[] }>;

/** One section to read a page deeper, from the cursor it stands at. */
type Read = Readonly<{ section: SectionId; cursor: string }>;

/** What one step asks for: the sections to read a page deeper, and whether the wire's own route goes with them. */
export type StreamStep = Readonly<{ wire: boolean; reads: readonly Read[] }>;

/** The older of two instants, where nothing is older than nothing and anything is older than nothing. */
const older = (one: Instant | null, other: Instant | null): Instant | null =>
  one === null ? other : other === null || one < other ? one : other;

/** The oldest instant among `items`, or nothing when there are none. */
export const oldestOf = (items: readonly ArticleSummary[]): Instant | null =>
  items.reduce<Instant | null>((oldest, item) => older(oldest, item.publishedAt), null);

/**
 * Where every section stands after `steps`: the cursor its last reading left it at, and the oldest item any reading
 * of it brought back. A section a step did not read stands where the step before left it.
 */
export const reachOf = (steps: readonly StreamPage[]): readonly Reach[] => {
  const reached = new Map<SectionId, Reach>();
  for (const step of steps) {
    for (const each of step.reached) {
      const before = reached.get(each.section)?.oldest ?? null;
      reached.set(each.section, { section: each.section, next: each.next, oldest: older(before, each.oldest) });
    }
  }
  return [...reached.values()];
};

/**
 * The instant at and above which the merge is whole: the newest of the oldest items of the sections that still have a
 * page left, or nothing when none has — everything read is then all there is to read.
 *
 * Below it, a page nobody has asked for could still hold something that belongs there, so a screen that drew it would
 * be drawing an order it cannot answer for. A section that has run out constrains nothing, having no page left to
 * surprise anyone with; one that has given nothing yet says nothing of where it stands, and constrains nothing either.
 */
export const floorOf = (reach: readonly Reach[]): Instant | null =>
  reach.reduce<Instant | null>(
    (floor, each) =>
      each.next === null || each.oldest === null || (floor !== null && each.oldest <= floor) ? floor : each.oldest,
    null,
  );

/** How far under the floor a step reaches at the least before it stops at a day's start: a morning, twelve hours. */
const MORNING = 12 * 60 * 60 * 1000;

/**
 * The instant the step after `floor` reads down to: the start of the newsroom's day that runs twelve hours under it.
 *
 * A step completes a day, which is what the screen heads its runs with and what its foot names while the step is on
 * its way. From a floor in the morning it takes the day before as well: what is left of a day before noon is a third
 * of what the newsroom files in it, and before six next to nothing — of the 340 articles the first step read on
 * 25/09/2026, 109 were filed before noon and 3 before six. The rule stopped at the night once, and on the iPhone
 * simulator a step from a floor at 6 h 30 read the one section above it, waited seven seconds for the page, and drew
 * one article, the reader at the foot again at once.
 */
export const targetOf = (floor: Instant): Instant =>
  instantAt(`${issueIdAt(instantOf(Date.parse(floor) - MORNING))} 00:00`) ?? floor;

/**
 * The step after `steps`, or nothing when no section has a page left to read.
 *
 * It reads a page deeper in the sections that stand above the day it completes, and in no other. The eleven used to
 * go deeper together, under one cursor: a section the newsroom runs rarely reached back two months on its first page,
 * and was asked for the two months before that on the second, which no reader was anywhere near — and the step waited
 * for it. Measured on the iPhone simulator on 25/09/2026, that second step asked for eleven pages and was whole after
 * 11.3 seconds, the last of them the page of Histoire; the first had taken 0.46.
 *
 * A section that has given nothing yet but has a page left is read again, it being the one thing here that cannot be
 * placed: nothing says whether what it holds lies above the day or below it.
 */
export const nextStepOf = (steps: readonly StreamPage[]): StreamStep | null => {
  const reach = reachOf(steps);
  const floor = floorOf(reach);
  // No floor: no section with a page left has given anything yet, and each of them is read.
  const target = floor === null ? null : targetOf(floor);
  const reads = reach.flatMap((each): readonly Read[] =>
    each.next !== null && (each.oldest === null || target === null || each.oldest > target)
      ? [{ section: each.section, cursor: each.next }]
      : [],
  );
  return reads.length === 0 ? null : { wire: false, reads };
};
