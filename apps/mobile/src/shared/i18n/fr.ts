/**
 * The French UI strings: the single source of the app's own text, keyed by a dotted path.
 *
 * Keys are grouped by their first segment and the groups run in alphabetical order, which a test holds; inside a
 * group a title comes before the message it heads, reading order rather than alphabetical.
 */
export const FR = {
  'action.retry': 'Réessayer',
  'app.name': 'Humanité',
  'article.premium': 'Abonnés',
  'article.related': 'Sur le même thème',
  'error.title': 'L’écran n’a pas pu s’afficher',
  'error.message': 'Une erreur est survenue.',
  'feed.empty.title': 'Rien à lire pour l’instant',
  'feed.empty.message': 'Aucun article n’est encore paru.',
  'feed.error.title': 'Le journal ne répond pas',
  'feed.error.message': 'Les articles n’ont pas pu être chargés.',
  'nav.headline': 'À la une',
  'nav.live': 'En continu',
  'nav.newsstand': 'Kiosque',
  'nav.account': 'Mon compte',
  'section.unknown.title': 'Rubrique introuvable',
  'section.unknown.message': 'Cette rubrique n’est pas au sommaire du journal.',
} as const satisfies Readonly<Record<string, string>>;
