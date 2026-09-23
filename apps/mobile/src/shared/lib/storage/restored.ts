import { isRecord } from '@huma/unknown';

/**
 * What a disk holds under one name, whatever it holds.
 *
 * Everything that comes back off a phone is a string the app wrote and anything at all could have replaced — a cleared
 * install, a file edited on a rooted device, a shape written by a version that no longer exists — so it arrives as
 * `unknown` and every store reads it one name at a time before believing any of it. That first step is the same for
 * every store, and lives here rather than in each: a store that wrote its own would be a second answer to what an
 * absent name means, and the two could differ without either being wrong on its own.
 *
 * What it does *not* do is say what the value is. Each store owes that itself, against the closed list or the parser
 * that its own field is worth — which is the part no shared helper could know.
 */
export const field = (persisted: unknown, name: string): unknown => (isRecord(persisted) ? persisted[name] : undefined);
