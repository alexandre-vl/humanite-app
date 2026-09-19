import type { DisplayText } from '@huma/contracts';
import { plural, t } from '#i18n';

/**
 * How many articles a question reached, in words. The number and the question are both written into the sentence by
 * the dictionary rather than glued to it here: the French, the quotation marks it uses and the place the number sits
 * in it all stay where the rest of the app's French is.
 */
export const countLabel = (total: number, query: string): DisplayText => {
  switch (plural(total)) {
    case 'one':
      return t('search.count.one', { count: total, query });
    case 'many':
      return t('search.count.many', { count: total, query });
  }
};
