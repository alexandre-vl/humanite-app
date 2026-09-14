/** Where ADRs live and how their files are named: every tool that locates an ADR reads these values. */

export const ADR_DIRECTORY = 'docs/adr';

/** Generated index of the ADRs, the only other file allowed in `ADR_DIRECTORY`. */
export const INDEX_FILE_NAME = 'README.md';

export const INDEX_FILE = `${ADR_DIRECTORY}/${INDEX_FILE_NAME}`;

/** Digits of an ADR number, in file names (`0007-…`) and identifiers (`ADR-0007`). */
export const NUMBER_DIGITS = 4;

export const MAX_NUMBER = 10 ** NUMBER_DIGITS - 1;

/** `NNNN-slug.md`: the number, then the slug of the title in lowercase letters, digits and single hyphens. */
export const ADR_FILE_NAME = new RegExp(
  String.raw`^(?<number>\d{${String(NUMBER_DIGITS)}})-(?<slug>[a-z0-9]+(?:-[a-z0-9]+)*)\.md$`,
  'u',
);

/** A name that starts with a number, even malformed: a number is never given twice, whatever follows it. */
export const NUMBERED_NAME = new RegExp(String.raw`^(?<number>\d{${String(NUMBER_DIGITS)}})-`, 'u');
