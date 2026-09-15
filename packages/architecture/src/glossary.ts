/**
 * The vocabulary of the newspaper in code: each French term, and each English synonym code could drift to, with the
 * one English word identifiers and file names use instead. The app's texts stay in French; its code speaks English.
 * Terms are strings, not keys: the spelling check reads identifiers, and would refuse the glossary itself.
 */
export const GLOSSARY = [
  ['abonne', 'subscriber'],
  ['abonnement', 'subscription'],
  ['breve', 'brief'],
  ['chapo', 'standfirst'],
  ['chapô', 'standfirst'],
  ['favori', 'bookmark'],
  ['favoris', 'bookmarks'],
  ['favorite', 'bookmark'],
  ['favorites', 'bookmarks'],
  ['kiosk', 'newsstand'],
  ['kiosque', 'newsstand'],
  ['lede', 'standfirst'],
  ['numero', 'issue'],
  ['rubric', 'section'],
  ['rubrique', 'section'],
  ['rubriques', 'sections'],
] as const satisfies readonly (readonly [Lowercase<string>, Lowercase<string>])[];
