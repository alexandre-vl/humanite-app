---
format: 1
status: accepted
significance: [guarded-config, boundary]
---

# Les identifiants de l’abonné au trousseau

## Contexte et problème

- Le jeton d’usager vit deux heures (`exp − iat = 7200`), et le glissement d’ADR-0041 ne le repousse que tant que l’abonné lit : une pause plus longue le laisse échoir.
- Mesuré le 27/09/2026 contre le service : aucune route ne rend un jeton neuf sans mot de passe pour l’application 300 — `POST /user/token/refresh` rend `400` « Invalid cookie », `secured-token` rend `403`, et `/user/login {convert_token}` rend `403` « Invalid authentification mode for brand ». Seul `POST /user/login` avec identifiants rend un jeton.
- Le client officiel garde donc les identifiants dans le `localStorage` de sa vue web, chiffrés par une phrase de passe écrite dans son propre code public (`dist.zip` 3.87.0) — un chiffrement de façade.
- ADR-0034 garde le jeton dans le trousseau, dont la clé vit dans un matériel que l’app ne lit ni ne copie, et le nomme « le seul secret que l’app détienne ».
- ADR-0033 R9 oublie un jeton qu’un `403` dénonce, ce qui déconnecte l’abonné passé deux heures.

Où l’app garde-t-elle de quoi rouvrir la connexion d’un abonné, sans exposer son mot de passe ?

## Critères de décision

- **C1** — l’abonné qui revient après plus de deux heures n’a rien à retaper
- **C2** — le mot de passe ne se lit pas en clair sur le téléphone
- **C3** — un mot de passe que le service a refusé n’est jamais gardé
- **C4** — rouvrir ne change pas le lecteur : le journal lu reste en cache
- **C5** — les identifiants partent à la déconnexion, ou quand le service les refuse

## Options étudiées

- Les identifiants au trousseau, et une reconnexion sur jeton mort
- Le mot de passe au magasin en clair, chiffré par une clé de l’app, comme le client officiel
- Rien de gardé, l’abonné retape après deux heures

## Décision

Option retenue : « Les identifiants au trousseau, et une reconnexion sur jeton mort », parce qu’elle seule évite à l’abonné de retaper (C1) sans mettre le mot de passe là où le magasin en clair se lit, le trousseau d’ADR-0034 tenant déjà l’autre secret de l’app (C2).

- **R1** — L’app DOIT garder les identifiants de l’abonné dans le trousseau, et nulle part ailleurs, une fois que le service les a acceptés.
- **R2** — L’app NE DOIT PAS garder des identifiants que le service a refusés.
- **R3** — Sur un jeton que le service ne reconnaît plus, l’app DOIT rouvrir la connexion avec les identifiants gardés puis redemander une fois, avant d’oublier le jeton.
- **R4** — Une reconnexion réussie NE DOIT PAS se lire comme un changement de lecteur.
- **R5** — L’app DOIT effacer les identifiants à la déconnexion, et quand le service les refuse à la reconnexion.

### Conséquences

- Bien, parce qu’un abonné qui rouvre l’app après une nuit lit sans retaper : l’app rouvre seule sa connexion (C1).
- Bien, parce que le mot de passe vit au trousseau, dont la clé reste dans le matériel du téléphone, là où le client officiel le chiffre d’une clé que son code publie (C2).
- Bien, parce que les identifiants ne sont gardés qu’après un `200` du service : un mot de passe faux n’atteint jamais le disque (C3).
- Bien, parce que la reconnexion tient le jeton neuf sans prévenir d’observateur : le journal lu reste en cache (C4).
- Bien, parce qu’une déconnexion, ou un refus à la reconnexion, efface les identifiants comme le jeton (C5).
- Mauvais, parce que le téléphone garde un secret qui n’expire pas : qui ouvre le trousseau d’un téléphone déverrouillé lit le mot de passe (C2).
- Mauvais, parce qu’ADR-0034 ne dit plus vrai : l’app détient deux secrets, non un, ce que ce texte corrige (C2).

## Avantages et inconvénients des options

### Les identifiants au trousseau, et une reconnexion sur jeton mort

- Bien, parce que c’est le seul chemin que le service laisse ouvert après deux heures (C1).
- Bien, parce que le trousseau garde déjà le jeton, et que son effacement écrase avant de supprimer (C2).
- Bien, parce qu’une seule place lit un jeton mort et décide d’y rouvrir plutôt que d’oublier (C4).
- Bien, parce que les identifiants ne sont gardés qu’après un `200`, jamais un mot de passe que le service a refusé (C3).
- Mauvais, parce qu’un mot de passe réutilisé ailleurs devient la cible la plus chère du téléphone (C2).

### Le mot de passe au magasin en clair, chiffré par une clé de l’app, comme le client officiel

- Bien, parce que rien de natif ne s’ajoute, le magasin en clair existant suffisant (C1).
- Mauvais, parce que la clé serait dans le paquet : qui lit le fichier lit de quoi l’ouvrir (C2).
- Mauvais, parce que le magasin garde ses anciennes écritures : un mot de passe effacé s’y lirait encore (C5).

### Rien de gardé, l’abonné retape après deux heures

- Bien, parce qu’aucun mot de passe n’est gardé nulle part (C2).
- Mauvais, parce que l’abonné retape à chaque pause d’une nuit ou d’une journée (C1).

## Informations complémentaires

- Preuves : R1 à R5 par convention, relues par les tests de l’app — `reader.test.ts` tient la garde des identifiants, leur effacement et la reconnexion ; `keychain.test.ts` tient la seconde entrée du trousseau ; `paper.test.ts` tient que rouvrir garde le journal et qu’un jeton irrécupérable le vide.
- Une entrée du trousseau protégée par la biométrie (`requireAuthentication`) reste possible, à décider à part.
- Réévaluation : le service ouvre à l’application 300 une route qui rend un jeton sans mot de passe, ou rend un jeton de vie plus longue.
