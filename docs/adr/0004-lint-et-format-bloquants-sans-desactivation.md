---
format: 1
status: proposed
significance: [guarded-config]
---

# Lint et format bloquants sans désactivation

## Contexte et problème

- `packages/eslint-config` compose ESLint et typescript-eslint en `strictTypeChecked`, avec react-hooks, react-x, boundaries, check-file et cspell (`cat packages/eslint-config/src/index.ts`).
- La configuration pose `noInlineConfig: true` et `reportUnusedInlineConfigs: ’error’` (`cat packages/eslint-config/src/index.ts`).
- `pnpm lint` juge chaque fichier suivi sans cache ni suppression, aucun message toléré (`pnpm lint`).
- `pnpm format:check` vérifie le formatage de tout le dépôt par Prettier (`pnpm format:check`).
- Un instantané des règles effectives interdit tout avertissement et épingle les bans typés à error (`pnpm test`).

Comment rendre le lint et le format contraignants, sans qu’un fichier puisse désactiver une règle ?

## Critères de décision

- **C1** — Chaque fichier suivi est jugé, sans exception.
- **C2** — Aucune désactivation n’est possible dans le code.
- **C3** — Le format est vérifié, pas seulement conseillé.
- **C4** — Un assouplissement de règle est refusé.

## Options étudiées

- ESLint et Prettier bloquants, sans désactivation
- ESLint avec `eslint-disable` autorisé au cas par cas
- Un format conseillé mais non vérifié
- Un linter unique tout-en-un

## Décision

Option retenue : « ESLint et Prettier bloquants, sans désactivation », parce que c’est la seule option qui juge chaque fichier (C1), retire toute désactivation en ligne (C2), vérifie le format (C3) et refuse tout assouplissement de règle (C4).

- **R1** — Le lint DOIT juger chaque fichier suivi, sans cache ni règle inconnue tolérée.
- **R2** — Le code NE DOIT PAS désactiver une règle en ligne ni porter de fichier de suppression.
- **R3** — Un fichier suivi DOIT être formaté par Prettier.
- **R4** — Une règle NE DOIT PAS rester au niveau avertissement, et les bans typés restent des erreurs.
- **R5** — Une règle dépréciée DOIT faire échouer le lint.

### Conséquences

- Bien, parce qu’aucun message n’est laissé de côté.
- Bien, parce qu’un contournement en ligne devient impossible.
- Mauvais, parce qu’un faux positif rare doit être corrigé, pas ignoré.

## Avantages et inconvénients des options

### ESLint et Prettier bloquants, sans désactivation

- Bien, parce que chaque fichier suivi est jugé (C1).
- Bien, parce que `noInlineConfig` retire toute désactivation (C2).
- Bien, parce que `format:check` échoue sur un fichier mal formaté (C3).
- Bien, parce que l’instantané des règles refuse tout assouplissement (C4).

### ESLint avec `eslint-disable` autorisé au cas par cas

- Mauvais, parce qu’une désactivation ouvre une brèche invisible (C2).

### Un format conseillé mais non vérifié

- Mauvais, parce qu’un fichier mal formaté passe sans être vu (C3).

### Un linter unique tout-en-un

- Mauvais, parce qu’il n’offre pas les règles typées exigées (C1).

## Informations complémentaires

- Les bans structurants et les frontières d’imports relèvent de leurs propres ADR ; celui-ci ne fixe que le caractère bloquant et sans désactivation du lint et du format.
- Réévaluation : un linter type-aware maintenu couvre les mêmes règles plus vite qu’ESLint.
