/** A page of results, with the cursor of the next page or `null` at the end. */
export type Page<Item> = Readonly<{
  items: readonly Item[];
  nextCursor: string | null;
  total: number;
}>;
