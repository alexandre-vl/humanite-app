---
format: 1
status: proposed
significance: [dependency, guarded-config, boundary, data-format]
---

# Cache de données TanStack Query persisté

## Contexte et problème

- Le cache des requêtes est persisté par PersistQueryClientProvider à la racine de l’app (`cat apps/mobile/src/_app/routes/root-layout.tsx`).
- Le buster du cache est le hash généré des contrats (`cat apps/mobile/src/_app/model/query-client.ts`).
- `react-native-mmkv` ne s’importe que depuis les bibliothèques partagées (`cat packages/architecture/src/places.ts`).
- Le stockage MMKV lit et écrit de façon synchrone (`cat apps/mobile/src/shared/lib/storage/storage.ts`).
- Le spike 0a a validé MMKV 4.3 et Nitro sur l’émulateur ([journal 0a](../spikes/phase-0a.md)).

Comment garder le cache des requêtes entre deux lancements sans retarder le premier rendu ?

## Critères de décision

- **C1** — Le cache des requêtes survit à un redémarrage.
- **C2** — Un changement des contrats écarte un cache devenu incompatible.
- **C3** — Le stockage natif reste hors des composants.
- **C4** — La lecture du cache au démarrage est synchrone.

## Options étudiées

- Le cache TanStack Query persisté sur MMKV
- Le cache TanStack Query en mémoire seule
- Un cache maison persisté sur AsyncStorage

## Décision

Option retenue : « Le cache TanStack Query persisté sur MMKV », parce que c’est la seule option où le cache survit au redémarrage (C1), où le buster l’écarte quand les contrats changent (C2), où le stockage reste confiné hors des composants (C3) et où la lecture au démarrage est synchrone (C4).

- **R1** — `react-native-mmkv` NE DOIT PAS être importée hors des bibliothèques partagées.
- **R2** — Le buster du cache persisté DOIT être le hash généré des contrats.

### Conséquences

- Bien, parce que le premier rendu montre le cache sans attendre le réseau.
- Bien, parce qu’un contrat modifié jette automatiquement un cache incompatible.
- Mauvais, parce que le cache persisté ajoute un format de plus à faire migrer.

## Avantages et inconvénients des options

### Le cache TanStack Query persisté sur MMKV

- Bien, parce que MMKV rend le cache dès le premier rendu (C1).
- Bien, parce que le buster lie la validité du cache aux contrats (C2).
- Bien, parce que MMKV reste confinée aux bibliothèques partagées (C3).
- Bien, parce que MMKV lit de façon synchrone au démarrage (C4).

### Le cache TanStack Query en mémoire seule

- Mauvais, parce que le cache disparaît à chaque redémarrage (C1).

### Un cache maison persisté sur AsyncStorage

- Mauvais, parce qu’AsyncStorage lit de façon asynchrone et retarde le premier rendu (C4).
- Mauvais, parce qu’un cache maison réinvente l’invalidation que le buster donne (C2).

## Informations complémentaires

- Le gcTime du QueryClient dérive de la même durée que le maxAge du persister, donc il ne descend jamais sous elle.
- Les premières requêtes existent (ADR-0021) et les données restaurées ne sont pas revalidées par un schéma : le buster hache toutes les sources des contrats, donc une forme qui change jette le cache entier avant qu’il ne soit lu, et un schéma n’ajouterait rien contre cette dérive. Ce que le buster ne voit pas est la corruption des octets, qu’un garde de forme refuse au retour du disque (`apps/mobile/src/_app/model/persister.ts`).
- Le grain de confinement atteignable est la place `lib` entière ; ADR-0006 confine les vues natives aux primitives L0, une bibliothèque de stockage sans vue vit dans `shared/lib`.
- L’état Zustand et les formats MMKV versionnés relèvent d’un ADR propre, écrit avec le premier store.
- Réévaluation : TanStack Query change son API de persistance, ou MMKV cesse d’être maintenue.
