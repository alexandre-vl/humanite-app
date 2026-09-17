import type { DisplayText } from '@huma/contracts';
import { FR } from './fr';

/** A key of the French dictionary. */
type Key = keyof typeof FR;

/** Brands the dictionary's strings as DisplayText: its values are authored text, sanctioned for display. */
const dictionary = <Entries extends Readonly<Record<string, string>>>(
  entries: Entries,
): { readonly [Name in keyof Entries]: DisplayText } => {
  const branded = (value: unknown): value is { readonly [Name in keyof Entries]: DisplayText } =>
    typeof value === 'object' && value !== null;
  if (branded(entries)) {
    return entries;
  }
  throw new Error('dictionnaire invalide');
};

const TEXT = dictionary(FR);

/** The French text for a key, as a DisplayText a native Text may render. */
export const t = (key: Key): DisplayText => TEXT[key];
