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
  'deps/importer-extra': {
    summary: 'le lockfile ne résout pour un paquet que les dépendances qu’il déclare',
    message: '{name} verrouillé mais déclaré par aucun manifeste de ce paquet : relancer pnpm install',
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
  'deps/catalog-missing': {
    summary: 'chaque dépendance en catalog: nomme une entrée du catalog',
    message: '{name} déclaré catalog: mais absent du catalog : l’ajouter à pnpm-workspace.yaml',
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
  'deps/peer-undeclared': {
    summary: 'un paquet déclare les pairs obligatoires de ses dépendances directes',
    message: '{dependency} exige {peer} en pair : le déclarer, sinon pnpm l’installe en silence',
  },
  'deps/root-dependency': {
    summary: 'un paquet ne dépend que des paquets des dossiers que la politique ouvre à son dossier',
    message: '{name} est rangé sous {target}/, dont les paquets de {root}/ ne peuvent pas dépendre',
  },
  'deps/root-unknown': {
    summary: 'chaque paquet est rangé sous un dossier de la politique',
    message: '{directory} n’est sous aucun dossier de la politique de dépendances',
  },
  'deps/dependency-confined': {
    summary: 'une dépendance réservée n’est déclarée que par les paquets que la politique autorise',
    message: 'dépendance {name} réservée : sous {root}/, seul {allowed} peut la déclarer',
  },
  'deps/single-instance': {
    summary: 'les paquets à instance unique ne sont installés qu’une fois',
    message: '{name} installé en {count} instances ({instances}) : aligner leurs pairs pour n’en garder qu’une',
  },
  'deps/single-version': {
    summary: 'les paquets à version unique sont déclarés en une seule version',
    message: '{name} résolu en plusieurs versions : {versions}',
  },
  'deps/private-copy': {
    summary:
      'une autre version d’un paquet à version unique n’est chargée que par les dépendants que la politique permet',
    message: '{name} {version} est chargé par {dependents} : seule la version du workspace est permise',
  },
  'deps/private-copy-unused': {
    summary: 'chaque copie privée permise par la politique existe encore',
    message: '{dependent} ne charge plus de copie privée de {name} : retirer cette exception',
  },
  'deps/sibling-version': {
    summary: 'une dépendance directe résout la version que les autres dépendances directes du paquet chargent',
    message: '{name} {version} déclaré, mais {dependent} charge {name} {loaded} : aligner les deux versions',
  },
  'deps/untested-version': {
    summary: 'une dépendance reste dans la plage que sa table de compatibilité a testée',
    message: '{name} {version} sort de la plage {range} testée par {source}',
  },
  'deps/policy-unknown': {
    summary: 'la politique de dépendances ne nomme que des paquets installés',
    message: '{name} n’est pas installé : la politique ne protège rien sous ce nom',
  },
} as const;

const DEPS_CHECKS = defineChecks(TABLE);

export type DepsCode = CheckCodeOf<typeof TABLE>;

export const depsFinding = DEPS_CHECKS.finding;
