import { SECTION, SECTION_ID } from '@huma/contracts';
import type { Section, SectionId } from '@huma/contracts';

/** The sections in the order of the category bar (docs/app-actuelle; environnement and sport assumed). */
export const SECTIONS: readonly Section[] = [
  { id: 'politique', code: 'pol', label: 'Politique', order: 1 },
  { id: 'social-eco', code: 'eco', label: 'Social Éco', order: 2 },
  { id: 'societe', code: 'soc', label: 'Société', order: 3 },
  { id: 'monde', code: 'mon', label: 'Monde', order: 4 },
  { id: 'culture-et-savoir', code: 'cul', label: 'Culture et savoir', order: 5 },
  { id: 'feminisme', code: 'fem', label: 'Féminisme', order: 6 },
  { id: 'environnement', code: 'env', label: 'Environnement', order: 7 },
  { id: 'sport', code: 'spo', label: 'Sport', order: 8 },
].map((raw) => SECTION.parse(raw));

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
