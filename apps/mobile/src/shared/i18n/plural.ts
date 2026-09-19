/** The two forms a French count takes. */
export type Plural = 'one' | 'many';

/**
 * Which form a count takes in French. The singular runs to one *inclusive* — « 0 résultat », « 1 résultat » — and the
 * plural begins at two. That is not where every language puts it, and Hermes has no `Intl.PluralRules` to ask, which
 * is why the rule is written once here rather than guessed at each place a number meets a word.
 */
export const plural = (count: number): Plural => (count <= 1 ? 'one' : 'many');
