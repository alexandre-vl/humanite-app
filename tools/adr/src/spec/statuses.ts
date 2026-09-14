import type { AdrNumber } from '../model/identifiers.ts';

/** Statuses written in an ADR file. A decided status is final: the file never changes afterwards. */
export const STATUSES = ['proposed', 'accepted', 'rejected'] as const;

export type Status = (typeof STATUSES)[number];

/** The only status an ADR can be committed with the first time. */
export const INITIAL_STATUS = 'proposed' satisfies Status;

export const TRANSITIONS = {
  proposed: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
} as const satisfies Readonly<Record<Status, readonly Status[]>>;

export type DecidedStatus = (typeof TRANSITIONS)[typeof INITIAL_STATUS][number];

export const DECIDED_STATUSES: readonly DecidedStatus[] = TRANSITIONS[INITIAL_STATUS];

export const isStatus = (value: string): value is Status => STATUSES.some((status) => status === value);

export const isDecided = (status: Status): status is DecidedStatus =>
  DECIDED_STATUSES.some((decided) => decided === status);

export const canTransition = (from: Status, to: Status): boolean =>
  TRANSITIONS[from].some((next: Status) => next === to);

/** The status readers see: an accepted ADR that an accepted successor lists in `supersedes` is superseded. */
export type EffectiveStatus = Readonly<{ kind: Status }> | Readonly<{ kind: 'superseded'; by: AdrNumber }>;

export const STATUS_LABELS = {
  proposed: 'proposé',
  accepted: 'accepté',
  rejected: 'rejeté',
  superseded: 'remplacé',
} as const satisfies Readonly<Record<EffectiveStatus['kind'], string>>;
