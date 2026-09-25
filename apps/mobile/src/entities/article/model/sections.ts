import type { Section } from '@huma/contracts';
import { useQuery } from '@tanstack/react-query';
import { sectionsQuery } from '../api/queries';

/**
 * The sections the newsroom publishes, in the order it runs them down the paper: the order the source lists them in,
 * which is the newsroom's own and the only one a section carries.
 *
 * Two screens ask. The front turns one page per section under a band naming them; the wire prints a block per section
 * under the running items. Both read this, so neither can run the paper in an order the other does not.
 */
export const useSections = (): readonly Section[] => useQuery(sectionsQuery).data ?? [];
