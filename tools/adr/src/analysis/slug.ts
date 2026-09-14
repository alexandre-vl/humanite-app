const LIGATURES: Readonly<Record<string, string>> = { Æ: 'AE', æ: 'ae', Œ: 'OE', œ: 'oe' };

/** File-name slug of a title: `Décisions d’architecture` → `decisions-d-architecture`. */
export const slugify = (title: string): string =>
  title
    .replace(/[ÆæŒœ]/gu, (ligature) => LIGATURES[ligature] ?? ligature)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
