import type { DisplayText, SectionId } from '@huma/contracts';

/**
 * What the newsroom calls the section an item ran in, as a screen answers it — `null` where it has no name to print.
 *
 * The sections are another entity's, and an entity may not reach sideways for them: so the screen asks once and hands
 * the answer down, and every card, row and article head reads it the same way, from the item's own section.
 */
export type SectionNames = (section: SectionId | undefined) => DisplayText | null;
