import { EXPO_FIXTURES } from './typed-routes.ts';

/** Every fixture of the Expo integration that can prove a rule; bindings point at their ids. */
export const EXPO_PROOFS = [...EXPO_FIXTURES] as const;
