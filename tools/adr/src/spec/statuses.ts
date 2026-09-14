import { isOneOf } from '@huma/kit/records';
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

export const isStatus = (value: string): value is Status => isOneOf(STATUSES, value);

export const isDecided = (status: Status): status is DecidedStatus => isOneOf(DECIDED_STATUSES, status);

export const canTransition = (from: Status, to: Status): boolean => isOneOf<Status>(TRANSITIONS[from], to);

/** The status readers see: an accepted ADR that an accepted successor lists in `supersedes` is superseded. */
export type EffectiveStatus = Readonly<{ kind: Status }> | Readonly<{ kind: 'superseded'; by: AdrNumber }>;

export const STATUS_LABELS = {
  proposed: 'proposé',
  accepted: 'accepté',
  rejected: 'rejeté',
  superseded: 'remplacé',
} as const satisfies Readonly<Record<EffectiveStatus['kind'], string>>;
