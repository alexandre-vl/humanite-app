import type { RepoPath } from '@huma/kit/paths';
import { slugify } from '../analysis/slug.ts';
import { adrNumber, adrPath } from '../model/identifiers.ts';
import type { Status } from '../spec/statuses.ts';

/** Replaces the single occurrence of `from`: a fixture whose mutation does not apply must fail loudly. */
export function replaceOnce(text: string, from: string, to: string): string {
  const first = text.indexOf(from);
  if (first === -1 || text.includes(from, first + from.length)) {
    throw new Error(`Mutation de fixture ambiguë ou sans effet : ${JSON.stringify(from)}`);
  }
  return `${text.slice(0, first)}${to}${text.slice(first + from.length)}`;
}

export const BASE_TITLE = 'Validation des données par Zod';

export const OTHER_TITLE = 'Validation des données par Valibot';

export type AdrDraft = Readonly<{
  title?: string;
  status?: Status;
  /** Raw content of the `supersedes` flow sequence, `ADR-0000` for instance. */
  supersedes?: string;
}>;

/** A complete ADR in format 1 that passes every file check; each fixture breaks it one way. */
export function adrDocument({ title = BASE_TITLE, status = 'proposed', supersedes }: AdrDraft = {}): string {
  return `---
format: 1
status: ${status}
significance: [dependency]${supersedes === undefined ? '' : `\nsupersedes: [${supersedes}]`}
---

# ${title}

## Contexte et problème

- La bibliothèque documente sa locale française sur [zod.dev](https://zod.dev).
- \`pnpm view zod version\` affiche la version publiée.

Quelle bibliothèque valide les données reçues par l’application ?

## Critères de décision

- **C1** — Messages d’erreur en français.
- **C2** — Types TypeScript inférés depuis le schéma.

## Options étudiées

- Zod
- Valibot

## Décision

Option retenue : « Zod », parce que sa locale française est fournie (C1).

- **R1** — Une donnée reçue DOIT être validée par un schéma Zod.
- **R2** — Un schéma PEUT être partagé entre deux paquets.

### Conséquences

- Bien, parce que les types découlent du schéma.
- Mauvais, parce que la bibliothèque alourdit le paquet.

## Avantages et inconvénients des options

### Zod

- Bien, parce que la locale française est fournie (C1).
- Bien, parce que les types sont inférés (C2).

### Valibot

- Mauvais, parce qu’aucune locale française n’est fournie (C1).
- Neutre, parce que les types sont aussi inférés (C2).

## Informations complémentaires

- Réévaluation : Zod cesse de publier sa locale française.
`;
}

export const pathFor = (number: number, title: string = BASE_TITLE): RepoPath =>
  adrPath(adrNumber(number), slugify(title));

export const ZERO = pathFor(0);

export const ONE = pathFor(1, OTHER_TITLE);

export const PROPOSED = adrDocument();

export const ACCEPTED = adrDocument({ status: 'accepted' });

/** The base document with one replacement, at the path of ADR-0000. */
export const mutated = (from: string, to: string): Readonly<Record<string, string>> => ({
  [ZERO]: replaceOnce(PROPOSED, from, to),
});
