import type { Access, DisplayText } from '@huma/contracts';
import { t } from '#i18n';

/**
 * Whether a list says an item is open to any reader, access by access.
 *
 * Four items in five are reserved to subscribers — twelve of the thirteen on a front page — so a mark on each of those
 * was a mark on four rows in five, and told a reader nothing a row without it did not. The mark goes on the exception:
 * the item anyone can read, which is what Mediapart marks on a paper as closed as this one. The table answers for
 * every access the contract declares, so an access added there stops the build here rather than travelling the lists
 * unmarked.
 */
const OPEN = { free: true, premium: false } satisfies Readonly<Record<Access, boolean>>;

/** The word a list prints under an item any reader may open, or none for an item reserved to subscribers. */
export const accessWord = (access: Access): DisplayText | null => (OPEN[access] ? t('article.free') : null);
