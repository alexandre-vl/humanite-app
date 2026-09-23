/**
 * A page of a list, with the cursor of the next page or `null` at the end.
 *
 * It carries no count of the whole. The journal's service sends none — not in a list, not in a search, not in a
 * header — and a count only the mock could fill would make the same screen say something on one source and nothing on
 * the other.
 */
export type Page<Item> = Readonly<{
  items: readonly Item[];
  nextCursor: string | null;
}>;
