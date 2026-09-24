---
format: 1
status: proposed
significance: [guarded-config, boundary]
---

# Aucune connexion, et le droit que le service accorde

## Contexte et problème

- ADR-0027 laisse la connexion du lecteur à un ADR d’elle-même, et ADR-0028 interdit d’ici là qu’une requête porte les identifiants d’un lecteur.
- Le service refuse de connecter qui ne porte pas de jeton : demandé honnêtement, sans `x-anonymous-token`, avec des identifiants inventés, `POST /user/login` répond `403` et `{"error":{"message":"Login access forbidden without token","code":10016}}` — il n’a pas lu les identifiants, il a refusé la requête. Mesuré le 24/09/2026 depuis le téléphone, par une sonde jetée après.
- Le même appel, mais sur `/countries`, répond `200` sans aucun jeton : le jeton n’est pas exigé partout, il l’est à la connexion.
- Ce jeton naît de `POST /anonymous-token`, dont le corps porte l’`app_secret` du client officiel et une attestation d’appareil (`~/ftp/lhuma_filtered_domains_09-21-2026-23-09-18.har`).
- Le site du journal connecte par un échange tenu sous son propre identifiant de client, que cette app n’est pas (`connexion.humanite.fr` et `sso.qiota.com`, mêmes captures).
- `right: false` sur 426 des 519 items de la capture : le mur est l’état ordinaire d’un article, et non son exception.
- Le droit que le service accorde est honoré à la lecture (`packages/contracts/src/intake.ts`), mais aucune fixture ne l’éprouve : des tests le tiennent, et ADR-0000 ne compte pour règle que ce qu’une preuve nomme.

Comment l’app lit-elle le journal sans emprunter l’identité d’un autre, quand le service ne connecte que son propre client ?

## Critères de décision

- **C1** — le lecteur lit ce que le service lui ouvre, et rien d’autre
- **C2** — l’app ne se fait passer ni pour le client officiel ni pour le site du journal
- **C3** — aucun secret d’un tiers n’entre dans le dépôt ni dans l’app
- **C4** — chaque règle a son juge, hors ligne

## Options étudiées

- Aucune connexion
- La connexion du client officiel, sa clé reprise
- Une connexion par le site du journal

## Décision

Option retenue : « Aucune connexion », parce qu’elle seule laisse l’app n’envoyer que ce qui lui appartient (C2, C3), et qu’elle se prouve par des juges qui n’atteignent aucun réseau (C4).

- **R1** — Une lecture d’un article NE DOIT PAS ouvrir un corps ailleurs que sur le droit que le service accorde.
- **R2** — Une requête au service NE DOIT PAS porter la clé ni le jeton anonyme du client officiel.
- **R3** — L’app NE DOIT PAS demander au lecteur les identifiants de son abonnement.

### Conséquences

- Bien, parce que le mur est désormais éprouvé dans les deux sens : un corps retenu reste fermé, un corps accordé est rendu entier (C1, C4).
- Bien, parce qu’un client qui frapperait le jeton anonyme est nommé par deux codes à la fois, l’adresse et l’emprunt (C2, C4).
- Mauvais, parce que l’abonné qui paie le journal ne lit ici que les articles libres, quatre sur cinq lui restant fermés (C1).
- Neutre, parce que la sonde qui a mesuré le refus n’est pas au dépôt : elle a servi une fois, depuis le téléphone, avec des identifiants que personne ne possède.

## Avantages et inconvénients des options

### Aucune connexion

- Bien, parce que rien de ce que l’app envoie n’appartient à quelqu’un d’autre (C2, C3).
- Bien, parce qu’une lecture qui ouvrirait ce que le service retient, comme une lecture qui retiendrait ce qu’il accorde, est nommée par une fixture (C1, C4).
- Mauvais, parce que le mur se dresse devant un abonné comme devant un passant (C1).

### La connexion du client officiel, sa clé reprise

- Bien, parce que l’abonné lirait ici ce que l’app du journal lui ouvre (C1).
- Mauvais, parce que la clé est celle d’un tiers, tirée d’une capture, et qu’elle entrerait dans l’app pour en sortir à chaque démarrage (C3).
- Mauvais, parce que le service ne pourrait plus distinguer ce client du sien, ce qu’il refuse précisément en demandant ce jeton (C2).

### Une connexion par le site du journal

- Bien, parce qu’aucune clé du client officiel ne serait reprise (C3).
- Mauvais, parce que l’échange est tenu sous l’identifiant du site : s’en réclamer serait se faire passer pour lui (C2).

## Informations complémentaires

- Preuves : une fixture par sens du mur et une pour le client qui emprunte le jeton (`tools/guardrails/src/proofs/right.ts`).
- R3 n’a pas de juge : aucun outil ne lit ce qu’un écran demande. Le contrat du contenu ne nomme aucune connexion, et la porte n’en tend aucune.
- ADR-0028 reste en vigueur, sa R4 comprise : rien ici ne la remplace.
- Réévaluation : le service ouvre une connexion aux clients tiers, ou le journal en autorise une à celui-ci.
