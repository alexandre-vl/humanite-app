import type { CheckCodeOf } from '@huma/kit/checks';
import { defineChecks } from '@huma/kit/checks';

/** Findings of `pnpm expo:types`: Expo reads the routes where the app keeps them and rewrites no tracked file. */
const TABLE = {
  'expo/routes-directory': {
    summary: 'Expo Router lit les routes dans le dossier prévu',
    message: 'Expo Router lirait les routes dans {directory}/ : seul {expected}/ en contient',
  },
  'expo/routes-invalid': {
    summary: 'Expo Router accepte l’arbre des routes',
    message: 'arbre de routes refusé par Expo Router : {error}',
  },
  'expo/tsconfig-rewrite': {
    summary: 'Expo ne réécrit pas tsconfig.json en préparant les routes typées',
    message: 'Expo réécrirait {fields} : include doit nommer .expo/types/**/*.ts et expo-env.d.ts tels quels',
  },
  'expo/gitignore-rewrite': {
    summary: 'Expo ne réécrit pas le .gitignore de l’app en préparant les routes typées',
    message: 'Expo ajouterait expo-env.d.ts à ce fichier : l’y écrire sur sa propre ligne',
  },
} as const;

export const EXPO_CHECKS = defineChecks(TABLE);

export type ExpoCode = CheckCodeOf<typeof TABLE>;

export const expoFinding = EXPO_CHECKS.finding;
