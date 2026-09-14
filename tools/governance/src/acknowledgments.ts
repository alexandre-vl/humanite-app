import type { Acknowledgment } from '@huma/adr/history';

/**
 * History findings examined and accepted by the maintainer, with the reason: a commit cannot be rewritten, so a past
 * mistake is acknowledged here once instead of failing every check forever. Empty while history is clean.
 */
export const ACKNOWLEDGMENTS: readonly Acknowledgment[] = [];
