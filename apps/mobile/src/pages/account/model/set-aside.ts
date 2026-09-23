import type { DisplayText } from '@huma/contracts';
import { plural, t } from '#i18n';

/** How many items the service sent that the app could not read, in words the dictionary writes the number into. */
export const setAsideLabel = (count: number): DisplayText => {
  switch (plural(count)) {
    case 'one':
      return t('account.setAside.one', { count });
    case 'many':
      return t('account.setAside.many', { count });
  }
};
