/** The French UI strings: the single source of the app's own text, keyed by a dotted path. */
export const FR = {
  'action.retry': 'Réessayer',
  'app.name': 'Humanité',
  'error.generic': 'Une erreur est survenue.',
  'feed.empty.title': 'Rien à lire pour l’instant',
  'feed.empty.message': 'Aucun article n’est encore paru.',
  'feed.error.title': 'Le journal ne répond pas',
  'feed.error.message': 'Les articles n’ont pas pu être chargés.',
  'nav.headline': 'À la une',
  'nav.live': 'En continu',
  'nav.newsstand': 'Kiosque',
  'nav.account': 'Mon compte',
} as const satisfies Readonly<Record<string, string>>;
