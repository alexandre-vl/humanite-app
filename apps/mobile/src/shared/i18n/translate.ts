import type { DisplayText } from '@huma/contracts';
import { asDisplayText } from '../lib/display-text';
import { FR } from './fr';

/** A key of the French dictionary. */
type Key = keyof typeof FR;

/** The French text for a key, as a DisplayText a native Text may render. */
export const t = (key: Key): DisplayText => asDisplayText(FR[key]);
