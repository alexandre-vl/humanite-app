import type { DisplayText } from '@huma/contracts';
import { counted } from '#i18n';

/** How many items the service sent that the app could not read, in words the dictionary writes the number into. */
export const setAsideLabel = (count: number): DisplayText => counted('account.setAside', count);
