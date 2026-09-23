---
format: 1
status: proposed
significance: [guarded-config, boundary, data-format]
---

# Un client du service du journal, borné et honnête

## Contexte et problème

- ADR-0027 branche le service du journal derrière la porte unique du contenu posée par ADR-0021, `apps/mobile/src/shared/api/content.ts`.
- Le `fetch` global de l’app est celui d’Expo, installé à la place de celui de React Native (`apps/mobile/node_modules/expo/src/winter/runtime.native.ts`).
- Le client OkHttp que React Native configure ne borne aucune requête dans le temps : connexion, lecture et écriture à zéro (`apps/mobile/node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/modules/network/OkHttpClientProvider.kt`).
- Dans la capture du 21/09/2026, la liste d’une rubrique que le serveur devait composer a mis de 4,4 à 6,1 s, huit fois sur treize (`~/ftp/lhuma_filtered_domains_09-21-2026-23-09-18.har`).
- Le client officiel s’y annonce `com.immanens.hybride.app.ios.300` et envoie `origin: file://` à chaque requête (même capture).
- Un paquet de la bibliothèque se compile sans `fetch`, sans minuteur ni abandon : `lib: ["ESNext"]` et `types: []` (`packages/tsconfig/hermes.json`).
- Les réponses du service sont enregistrées dans le dépôt avec la requête de chacune (`packages/remote-api/src/recorded.ts`).

Comment l’app interroge-t-elle le service sans rester suspendue, sans taire la cause d’un échec et sans se faire passer pour le client officiel ?

## Critères de décision

- **C1** — une requête rend toujours la main, dans un délai connu
- **C2** — un échec dit sa cause, qui décide des mots affichés et d’un nouvel essai
- **C3** — l’app se présente sous son propre nom
- **C4** — les tests et les parcours n’atteignent jamais le réseau
- **C5** — les adresses demandées sont celles que le service a déjà servies

## Options étudiées

- Un client injecté, jugé sur les réponses rejouées
- Le fetch global appelé par chaque requête des écrans
- Une bibliothèque HTTP générique

## Décision

Option retenue : « Un client injecté, jugé sur les réponses rejouées », parce qu’il pose son propre délai et nomme chaque cause (C1, C2), et qu’un test lui tend des ports qu’il pilote au lieu du réseau (C4).

- **R1** — Le client du service DOIT être importé par la seule place `api`.
- **R2** — Une requête au service DOIT rendre la main passé un délai fixe, en lâchant sa connexion.
- **R3** — Un échec DOIT porter le code de sa cause : réseau, délai, statut ou réponse illisible.
- **R4** — Une requête NE DOIT PAS porter le nom du client officiel ni les identifiants d’un lecteur.
- **R5** — Une adresse demandée au service DOIT avoir la forme d’une adresse que le client officiel a demandée.

### Conséquences

- Bien, parce qu’une liste lente échoue en `timeout` après quinze secondes au lieu de laisser un écran charger sans fin (C1).
- Bien, parce que l’écran dit « Pas de connexion » ou « Le journal tarde à répondre » selon la cause, et n’offre un nouvel essai que là où il peut aboutir (C2).
- Bien, parce que le service sait à qui il répond : un client non officiel, sous son nom (C3).
- Bien, parce que chaque règle a son juge, qu’un client tordu d’une seule façon fait parler (C4).
- Mauvais, parce qu’une réponse qui viendrait en seize secondes est perdue, et que deux nouveaux essais portent l’attente, au pire, à quarante-huit secondes (C1).
- Mauvais, parce qu’une route que le service ajoute ne se demande qu’après une nouvelle capture (C5).
- Neutre, parce que le corps d’un article est demandé sans jeton, et que ce que le service en rend à un lecteur non connecté n’a jamais été capté (C2).

## Avantages et inconvénients des options

### Un client injecté, jugé sur les réponses rejouées

- Bien, parce que le délai et la cause sont les siens, et non ceux d’une plateforme qui n’en garantit aucun (C1, C2).
- Bien, parce qu’un test lui tend des ports qu’il pilote, et qu’aucun n’atteint le réseau (C4).
- Bien, parce que le nom sous lequel l’app se présente est écrit une fois, dans le client, et non à chaque requête (C3).
- Mauvais, parce que les ports sont à écrire et à tenir des deux côtés de la porte (C4).

### Le fetch global appelé par chaque requête des écrans

- Bien, parce qu’aucun paquet ni port ne serait à écrire (C4).
- Mauvais, parce que chaque requête poserait son délai et lirait sa cause, et qu’une seule l’oublierait (C1, C2).
- Mauvais, parce qu’un test qui rend un écran atteindrait le réseau (C4).

### Une bibliothèque HTTP générique

- Bien, parce que délai et nouvel essai y sont déjà écrits (C1).
- Mauvais, parce qu’elle lit un échec à son type, que le `fetch` d’Expo ne distingue pas d’un abandon (C2).
- Mauvais, parce qu’elle ne sait rien des adresses que le service a servies (C5).

## Informations complémentaires

- Le délai de quinze secondes laisse deux fois et demie la plus lente des listes captées.
- Le mock sert le même lecteur non connecté : le corps d’un article réservé y est retenu, comme le service le retient.
- Réévaluation : quand la connexion d’un lecteur ajoute un jeton aux requêtes, ou quand une capture montre une route que le client ne sait pas demander.
