import { SECTION, SECTION_ID } from '@huma/contracts';
import type { Section, SectionId } from '@huma/contracts';
import type { SectionCode } from '@huma/design-tokens';

/** How many of a section's six articles are of each of the two formats the corpus spreads by quota. */
export type Quota = Readonly<{ video: number; column: number }>;

/**
 * The sections of the corpus, in the order of the category bar, each with the three letters its items, its pictures and
 * its ground are named by, and how many videos and columns it files.
 *
 * The first seven are the journal's own — slug, name and place in its menu alike (`/wordpress/menu`); `sport` is the
 * corpus's alone. The letters are the corpus's too: the journal numbers its sections and names no code, so the letters
 * stay here, with the fiction that is written in them, and not in the domain. The quota was a table of its own, keyed
 * by slugs spelt a second time and read back through the brand; on the row, a section cannot be written without one.
 */
const REGISTRY = [
  { id: 'politique', code: 'pol', label: 'Politique', quota: { video: 1, column: 0 } },
  { id: 'social-eco', code: 'eco', label: 'Social Éco', quota: { video: 0, column: 1 } },
  { id: 'societe', code: 'soc', label: 'Société', quota: { video: 0, column: 0 } },
  { id: 'monde', code: 'mon', label: 'Monde', quota: { video: 1, column: 1 } },
  { id: 'culture-et-savoir', code: 'cul', label: 'Culture et savoir', quota: { video: 1, column: 1 } },
  { id: 'feminisme', code: 'fem', label: 'Féminisme', quota: { video: 0, column: 0 } },
  { id: 'environnement', code: 'env', label: 'Environnement', quota: { video: 0, column: 0 } },
  { id: 'sport', code: 'spo', label: 'Sport', quota: { video: 1, column: 0 } },
] as const satisfies readonly Readonly<{ id: string; code: SectionCode; label: string; quota: Quota }>[];

/** The sections as the domain knows them, in the order of the bar: the letters stay behind. */
export const SECTIONS: readonly Section[] = REGISTRY.map(({ id, label }) => SECTION.parse({ id, label }));

/** The three letters of the section `id` names, or `undefined` for an id that names no section of this corpus. */
export const codeOf = (id: SectionId | undefined): SectionCode | undefined =>
  REGISTRY.find((each) => each.id === id)?.code;

/** The formats the section `id` files by quota, or `undefined` for an id that names no section of this corpus. */
export const quotaOf = (id: SectionId): Quota | undefined => REGISTRY.find((each) => each.id === id)?.quota;

/**
 * Someone who signs a piece of this corpus. Not a value of the domain and never one again: an item carries the name
 * it is signed with, written out, because that is all the journal's service ever sends. This table is what turns the
 * identifiers a corpus file is written with into that name, and what the corpus's own rules about who may sign what
 * are checked against. Nothing outside this package sees one.
 */
type Writer = Readonly<{ id: string; name: string; section: SectionId; isColumnist: boolean }>;

const writer = (raw: Readonly<{ id: string; name: string; section: string; isColumnist: boolean }>): Writer => ({
  ...raw,
  section: SECTION_ID.parse(raw.section),
});

/** The fictional newsroom: each author, their section, and whether they are its columnist. */
export const AUTHORS: readonly Writer[] = [
  { id: 'lucie-varenne', name: 'Lucie Varenne', section: 'politique', isColumnist: false },
  { id: 'karim-belhadj', name: 'Karim Belhadj', section: 'politique', isColumnist: false },
  { id: 'marion-castel', name: 'Marion Castel', section: 'social-eco', isColumnist: false },
  { id: 'julien-ferrand', name: 'Julien Ferrand', section: 'social-eco', isColumnist: false },
  { id: 'bernard-quillet', name: 'Bernard Quillet', section: 'social-eco', isColumnist: true },
  { id: 'nadia-oussedik', name: 'Nadia Oussedik', section: 'societe', isColumnist: false },
  { id: 'thomas-lecuyer', name: 'Thomas Lécuyer', section: 'societe', isColumnist: false },
  { id: 'elise-morvan', name: 'Élise Morvan', section: 'monde', isColumnist: false },
  { id: 'samir-haddad', name: 'Samir Haddad', section: 'monde', isColumnist: false },
  { id: 'yves-kerlan', name: 'Yves Kerlan', section: 'monde', isColumnist: true },
  { id: 'helene-marchetti', name: 'Hélène Marchetti', section: 'culture-et-savoir', isColumnist: false },
  { id: 'paul-delorme', name: 'Paul Delorme', section: 'culture-et-savoir', isColumnist: false },
  { id: 'odile-sarrazin', name: 'Odile Sarrazin', section: 'culture-et-savoir', isColumnist: true },
  { id: 'claire-vasseur', name: 'Claire Vasseur', section: 'feminisme', isColumnist: false },
  { id: 'ines-benali', name: 'Inès Benali', section: 'feminisme', isColumnist: false },
  { id: 'hugo-lambert', name: 'Hugo Lambert', section: 'environnement', isColumnist: false },
  { id: 'lea-fontanel', name: 'Léa Fontanel', section: 'environnement', isColumnist: false },
  { id: 'maxime-renaud', name: 'Maxime Renaud', section: 'sport', isColumnist: false },
  { id: 'sofia-laurenti', name: 'Sofia Laurenti', section: 'sport', isColumnist: false },
].map(writer);

/**
 * The word a signature of this corpus joins two names with.
 *
 * Written once because two things read it from opposite ends: what builds a signature out of the identifiers a corpus
 * file is written with, and what reads the names back out of a built one to check who signed what. A separator each
 * side spelt for itself is a separator that can differ.
 */
const AND = ' et ';

/** The signature the identifiers of a corpus file stand for, or nothing when a file names no one. */
export const bylineOf = (ids: readonly string[]): string | undefined => {
  const names = ids.map((id) => AUTHORS.find((author) => author.id === id)?.name ?? id);
  return names.length === 0 ? undefined : names.join(AND);
};

/** The names a signature carries, in the order it carries them. */
export const namesOf = (byline: string | undefined): readonly string[] =>
  byline === undefined ? [] : byline.split(AND).map((name) => name.trim());
