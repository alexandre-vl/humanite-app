---
format: 1
status: proposed
significance: [guarded-config, boundary]
supersedes: [ADR-0031]
---

# La connexion de l’abonné, sous une clé prêtée

## Contexte et problème

- ADR-0031 a écarté toute connexion, et a nommé sa réévaluation : une connexion que le journal ouvrirait à ce client (`docs/adr/0031-aucune-connexion-et-le-droit-que-le-service-accorde.md`).
- Mesuré le 24/09/2026 depuis le téléphone : `POST /anonymous-token`, puis `POST /user/login`, puis `GET /wordpress/post/3868546` rendent `right: true` et le corps entier à un abonné ; le même article sans jeton d’usager reste `right: false` (`~/Downloads/filtered_domains_09-24-2026-13-20-13.har`).
- Le corps de `POST /anonymous-token` porte l’`app_secret` du client officiel et une attestation d’appareil `jdly` ; le jeton d’usager naît de `POST /user/login`, sous ce jeton anonyme (même capture, et ADR-0027).
- Le dépôt refuse d’accueillir un secret : une lecture nomme jeton, mot de passe et clé, et arrête la commande qui écrirait un fichier suivi (`tools/capture/src/secrets.ts`).
- Le client que le dépôt livre est éprouvé pour ne pas emprunter la clé du client officiel (`tools/guardrails/src/proofs/transport.ts`).

Comment l’app éprouve-t-elle la lecture d’un abonné, quand la connexion exige une clé que le dépôt refuse d’accueillir ?

## Critères de décision

- **C1** — l’abonné lit ce que le service lui accorde une fois connecté
- **C2** — aucun secret du client officiel n’entre dans un fichier suivi
- **C3** — l’app n’emprunte l’identité du client officiel qu’au développement
- **C4** — chaque règle a son juge, hors ligne

## Options étudiées

- La connexion de l’abonné, la clé prêtée au développement
- Aucune connexion
- La connexion sous une clé dédiée seulement

## Décision

Option retenue : « La connexion de l’abonné, la clé prêtée au développement », parce qu’elle seule éprouve la lecture connectée dès maintenant (C1), la clé restant injectée au démarrage, hors de tout fichier suivi (C2).

- **R1** — Une lecture d’un article NE DOIT PAS ouvrir un corps ailleurs que sur le droit que le service accorde.
- **R2** — Une requête du client livré NE DOIT PAS porter la clé ni le jeton anonyme du client officiel.
- **R3** — L’app PEUT demander à l’abonné les identifiants de son abonnement, pour les porter à la connexion du service.

### Conséquences

- Bien, parce que la lecture d’un abonné est éprouvée de bout en bout, le droit accordé rendu entier, et le mur tenu par des juges hors ligne (C1, C4).
- Bien, parce que la clé prêtée reste là où une lecture arrête tout secret, hors du dépôt (C2).
- Mauvais, parce qu’un build de développement emprunte l’identité du client officiel, ce que le service distingue du sien (C3).
- Neutre, parce qu’une clé dédiée, le jour où le journal la remet, changera cette décision sans changer l’app.

## Avantages et inconvénients des options

### La connexion de l’abonné, la clé prêtée au développement

- Bien, parce que l’abonné lit ici ce que le service lui ouvre, un juge hors ligne tenant le mur des deux côtés (C1, C4).
- Bien, parce que la clé prêtée se tient hors de tout fichier suivi, où une lecture arrête déjà les secrets (C2).
- Mauvais, parce qu’un build de développement se fait passer pour le client officiel (C3).

### Aucune connexion

- Bien, parce que rien de ce que l’app envoie n’appartient à un tiers (C2, C3).
- Mauvais, parce que l’abonné qui paie le journal ne lit ici que les articles libres (C1).

### La connexion sous une clé dédiée seulement

- Bien, parce qu’aucune clé d’un tiers n’entrerait jamais dans l’app (C2, C3).
- Mauvais, parce que la lecture connectée resterait sans preuve tant que le journal n’a pas remis cette clé (C1).

## Informations complémentaires

- Preuves : R1 et R2 gardent les juges d’ADR-0031 (`tools/guardrails/src/proofs/right.ts`, `tools/guardrails/src/proofs/transport.ts`). R3 n’a pas de juge : aucun outil ne lit ce qu’un écran demande.
- La clé prêtée et les identifiants passent au démarrage, jamais par un fichier suivi, que la lecture de `tools/capture/src/secrets.ts` garde.
- Réévaluation : le journal remet une clé dédiée à ce client, et la clé prêtée quitte le développement.
