import type { DisplayText } from '@huma/contracts';
import { plural, t } from '#i18n';

/**
 * How much a numéro holds, in words. The number is written into the sentence by the dictionary rather than glued to it
 * here, so the French and the place the number sits in it stay where the rest of the app's French is.
 */
export const countLabel = (count: number): DisplayText => {
  switch (plural(count)) {
    case 'one':
      return t('issue.count.one', { count });
    case 'many':
      return t('issue.count.many', { count });
  }
};
