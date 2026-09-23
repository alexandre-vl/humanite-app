import type { Section } from '@huma/contracts';
import { useQuery } from '@tanstack/react-query';
import { sectionsQuery } from '../api/queries';

/**
 * The sections the newsroom publishes, in the order it runs them down the paper: the order the source lists them in,
 * which is the newsroom's own and the only one a section carries.
 */
export const useSections = (): readonly Section[] => useQuery(sectionsQuery).data ?? [];
