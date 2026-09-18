import type { DisplayText } from '@huma/contracts';

/**
 * Marks a string as sanctioned for display. The brand carries no evidence a machine can re-check — only the caller
 * knows whether the text came from the dictionary, from a formatter or from a validated field of a contract — so this
 * is the single place that vouches for one, and the only mistake left to catch here is a string with nothing to read.
 */
export const asDisplayText = (value: string): DisplayText => {
  const sanctioned = (text: unknown): text is DisplayText => typeof text === 'string' && text.trim().length > 0;
  if (sanctioned(value)) {
    return value;
  }
  throw new Error('texte affichable vide');
};
