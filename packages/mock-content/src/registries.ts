import { AUTHOR, SECTION } from '@huma/contracts';
import type { Author, Section } from '@huma/contracts';

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

/** The fictional newsroom: each author, their section, and whether they are its columnist. */
export const AUTHORS: readonly Author[] = [
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
].map((raw) => AUTHOR.parse(raw));
