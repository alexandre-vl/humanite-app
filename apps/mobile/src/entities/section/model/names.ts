import type { DisplayText, SectionId } from '@huma/contracts';
import { useQuery } from '@tanstack/react-query';
import { sectionsQuery } from '../api/queries';

/**
 * What the newsroom calls each of its sections, as a screen asks it one article at a time.
 *
 * A card names the section it ran in, and the name is the section entity's to give — but a card is an article, and
 * one entity may not reach sideways into another. So the screen in between asks here once and hands the answer down
 * with every card, which also means one query serves a whole feed rather than one per cell being recycled.
 *
 * An unanswered list gives no name rather than a guess: a slug is an address, not a word the paper prints.
 */
export const useSectionNames = (): ((section: SectionId) => DisplayText | null) => {
  const sections = useQuery(sectionsQuery).data;
  return (section) => sections?.find((one) => one.id === section)?.label ?? null;
};
