---
format: 1
status: proposed
significance: [guarded-config, boundary, reversal-cost]
supersedes: [ADR-0032]
---

# La connexion de l’abonné, sous la clé publique du client

## Contexte et problème

- ADR-0032 a ouvert la connexion sous une clé prêtée, injectée au démarrage, qu’aucun fichier suivi ne portait : aucune release ne l’ouvrait (ADR-0032).
- La clé (`app_secret`) n’est pas une clé privée : la même identifie l’application 300 dans chaque install du client officiel et monte sur son fil à chaque lancement, d’où tout abonné la relève de son propre trafic — d’où vient celle du dépôt. Le journal la garde obfusquée, non en clair.
- L’attestation `jdly` est un chiffré AES-128-CBC, en hexadécimal, du JSON `{ "id", "sgn", "sgn_ver" }` sous une clé que le client porte (`1234567890123456` / `6543210987654321`, lues dans `libanDeliveryCore`). L’`id` est un UUID tiré une fois par install ; rien n’y atteste un matériel.
- Mesuré le 26/09/2026 : un `jdly` frappé pour un UUID neuf rend `POST /anonymous-token` → 200, puis la chaîne suit jusqu’à un article réservé `right: true`. Le service ne lit pas la signature — une `sgn` fausse est prise de même.

Comment une release publique ouvre-t-elle la connexion de l’abonné, sans clé privée ni valeur empruntée à un appareil ?

## Critères de décision

- **C1** — une release publiée ouvre la connexion : « Se connecter » y fonctionne
- **C2** — aucun secret propre à l’abonné — identifiant, mot de passe, jeton d’usager — n’entre dans un fichier suivi ni dans un binaire
- **C3** — chaque install s’atteste comme son propre appareil, sans valeur empruntée à un autre
- **C4** — le client de lecture livré ne porte ni la clé ni le jeton anonyme du client officiel

## Options étudiées

- La clé publique du client portée par l’app, et l’appareil frappé par l’app pour chaque install
- La clé prêtée, injectée au démarrage, et la connexion réservée aux builds de développement (ADR-0032)
- Un serveur intermédiaire qui porte la clé et relaie la connexion

## Décision

Option retenue : « La clé publique du client portée par l’app, et l’appareil frappé par l’app pour chaque install », parce qu’elle seule ouvre la connexion depuis une release (C1) sans emprunter la valeur d’un appareil (C3) : la clé est un credential que tout abonné relève déjà, le seul secret d’un abonné — ce qu’il tape — n’est jamais écrit (C2), et le client de lecture reste sans clé (C4).

- **R1** — Une lecture d’un article NE DOIT PAS ouvrir un corps ailleurs que sur le droit que le service accorde.
- **R2** — Une requête du client de lecture livré NE DOIT PAS porter la clé ni le jeton anonyme du client officiel.
- **R3** — L’app PEUT demander à l’abonné les identifiants de son abonnement, pour les porter à la connexion du service.
- **R4** — L’app DOIT porter la clé publique du client et frapper elle-même l’attestation d’appareil, à partir d’un identifiant aléatoire qu’un install garde ; une release publiée ouvre la connexion.
- **R5** — Aucun secret propre à l’abonné — son identifiant, son mot de passe, le jeton d’usager que sa connexion gagne — NE DOIT PAS entrer dans un fichier suivi ni dans un binaire.

### Conséquences

- Bien, parce qu’une release publiée ouvre la connexion, sans clé injectée ni build à part (C1).
- Bien, parce que l’appareil est frappé sur place, d’un UUID que l’install garde : rien n’est emprunté, et le service voit un appareil stable (C3).
- Bien, parce que le seul secret d’un abonné est ce qu’il tape, gardé dans le trousseau que pose ADR-0034 (C2).
- Bien, parce que le client de lecture continue de demander sans clé, et que la garde le tient (C4).
- Mauvais, parce que la clé publique part dans le binaire et l’historique public : qui dézippe une release la lit, et le jour où le journal la fait tourner, la connexion se ferme jusqu’au rafraîchissement de la constante.
- Mauvais, parce que la `sgn` est laissée vide plutôt que forgée, ce que le service tolère aujourd’hui mais pourrait cesser de tolérer.

## Avantages et inconvénients des options

### La clé publique du client portée par l’app, et l’appareil frappé par l’app pour chaque install

- Bien, parce qu’une release ouvre la connexion sans rien de plus qu’une constante que tout abonné relève déjà (C1).
- Bien, parce que chaque install s’atteste comme son propre appareil, sans valeur empruntée (C3), et que le client de lecture reste sans clé (C4).
- Mauvais, parce que la clé du client part en clair dans le binaire public, là où le journal la garde obfusquée (C1).

### La clé prêtée, injectée au démarrage, et la connexion réservée aux builds de développement (ADR-0032)

- Bien, parce qu’aucun fichier suivi ne porte la clé, et qu’aucune release ne la porte (C2).
- Mauvais, parce qu’une release publiée n’ouvre alors aucune connexion : « Se connecter » ne servirait à rien (C1).

### Un serveur intermédiaire qui porte la clé et relaie la connexion

- Bien, parce que la clé ne quitte jamais le serveur, et n’entre dans aucun binaire (C1).
- Mauvais, parce que le mot de passe de chaque abonné passerait alors par un serveur du mainteneur, là où il ne va aujourd’hui qu’au service (C2).

## Informations complémentaires

- Preuves : R1 par le banc `right/*` et R2 par `transport/borrows-key` (`tools/guardrails/src/proofs/`) ; R4 par `device.ts` et `aes.ts`, que `device.test.ts` et `aes.test.ts` (vecteurs FIPS-197 et SP 800-38A) tiennent, et par `reader.ts` que `reader.test.ts` tient ; R3 et R5 par convention.
- Réévaluation : le journal fait tourner `app_secret` ou en donne un dédié ; le service se met à lire la signature ; l’app entre sur un store qui impose sa propre identité.
