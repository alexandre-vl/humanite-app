import type { CheckCodeOf } from '@huma/kit/checks';
import { defineChecks } from '@huma/kit/checks';

/** Findings of `deps:check`: the manifests, the catalog and the lockfile agree, and every version is one choice. */
const TABLE = {
  'deps/lockfile-version': {
    summary: 'le lockfile est au format de pnpm 11',
    message: 'lockfile au format {version} : 9.0 attendu, relancer pnpm install',
  },
  'deps/importer-missing': {
    summary: 'chaque paquet du workspace est résolu dans le lockfile',
    message: 'paquet {directory} absent du lockfile : relancer pnpm install',
  },
  'deps/importer-unknown': {
    summary: 'le lockfile ne résout que les paquets du workspace',
    message: 'le lockfile résout {directory}, qui n’est pas un paquet du workspace : relancer pnpm install',
  },
  'deps/importer-stale': {
    summary: 'le lockfile suit les manifestes',
    message: '{name} déclaré {specifier}, verrouillé {locked} : relancer pnpm install',
  },
  'deps/catalog-range': {
    summary: 'le catalog épingle des versions exactes',
    message: '{name} : {version} n’est pas une version exacte',
  },
  'deps/catalog-stale': {
    summary: 'le lockfile suit le catalog',
    message: '{name} : catalog {version}, lockfile {locked} : relancer pnpm install',
  },
  'deps/catalog-unused': {
    summary: 'chaque entrée du catalog sert à un paquet',
    message: '{name} n’est déclaré par aucun paquet : le retirer du catalog',
  },
  'deps/specifier-form': {
    summary: 'une dépendance passe par le catalog ou le workspace',
    message: '{name} déclaré {specifier} : {expected} attendu',
  },
  'deps/reference-missing': {
    summary: 'chaque paquet TypeScript du workspace dont un paquet dépend est une de ses références',
    message: '{dependency} est une dépendance sans référence TypeScript : ajouter {path} aux references',
  },
  'deps/reference-undeclared': {
    summary: 'chaque référence TypeScript vers un paquet du workspace est une dépendance déclarée',
    message: 'référence vers {reference} sans dépendance workspace:* déclarée',
  },
  'deps/single-version': {
    summary: 'les paquets qui doivent être uniques n’ont qu’une version',
    message: '{name} résolu en plusieurs versions : {versions}',
  },
  'deps/peer-undeclared': {
    summary: 'un paquet déclare les pairs obligatoires de ses dépendances directes',
    message: '{dependency} exige {peer} en pair : le déclarer, sinon pnpm l’installe en silence',
  },
} as const;

export const DEPS_CHECKS = defineChecks(TABLE);

export type DepsCode = CheckCodeOf<typeof TABLE>;

export const depsFinding = DEPS_CHECKS.finding;
