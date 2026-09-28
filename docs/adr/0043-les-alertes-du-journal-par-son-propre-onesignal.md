---
format: 1
status: accepted
significance: [dependency, guarded-config, boundary, data-format]
---

# Les alertes du journal par son propre OneSignal

## Contexte et problème

- Le client officiel 6.2.0 inscrit chaque installation auprès de OneSignal, sous l’application du journal (`HumaniteApplication.java`), et ouvre dans sa vue web l’adresse d’une alerte touchée (`HumaniteActivity.onClick`).
- Lu le 28/09/2026, `android_params.js` ne nomme aucun projet Firebase : le SDK tire son jeton du projet partagé de OneSignal, qu’aucun nom de paquet ne borne (`PushRegistratorFCM.java`).
- Apple ne remet une notification qu’à l’app que nomme son en-tête `apns-topic` ([documentation d’Apple](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns)) : le journal y nomme la sienne.
- `react-native-onesignal` 5.5.14 réclame son module natif dès l’import (`TurboModuleRegistry.getEnforcing`), mais ne s’inscrit nulle part avant `initialize`.
- Sans `com.onesignal.suppressLaunchURLs`, le SDK ouvre une alerte touchée dans le navigateur (`OSNotificationOpenBehaviorFromPushPayload`) ; `onesignal.disableLocation` retire son module de position.
- Le service sert chaque article avec son `slug`, dernier segment de l’adresse de sa page sur humanite.fr (`recorded.ts`).
- ADR-0033 interdit à une requête le nom du client officiel (R4), et fait lire le corpus simulé à une build qui ne nomme aucune source (R6).

Comment l’app reçoit-elle les alertes de la rédaction sans inscrire nulle part un lecteur qui ne les a pas demandées ?

## Critères de décision

- **C1** — le lecteur reçoit les alertes que la rédaction choisit, quand elle les envoie
- **C2** — rien ne quitte le téléphone avant que le lecteur demande les alertes
- **C3** — le journal reconnaît les inscriptions de ce client, et peut les écarter
- **C4** — une alerte touchée ouvre son article dans l’app, sinon sa page
- **C5** — ni serveur à tenir, ni dépendance native hors de la place `api`

## Options étudiées

- Le SDK OneSignal sous l’application du journal
- Des alertes à nous, tirées du fil par un serveur
- Des notifications locales, tirées du fil en tâche de fond

## Décision

Option retenue : « Le SDK OneSignal sous l’application du journal », parce qu’elle seule reçoit les alertes que la rédaction choisit, à l’heure où elle les envoie (C1), sans serveur à tenir (C5), et qu’elle ne démarre qu’au « oui » du lecteur (C2).

- **R1** — Le paquet `react-native-onesignal` DOIT être importé par la seule place `api`.
- **R2** — L’app NE DOIT PAS démarrer OneSignal avant que le lecteur ait demandé les alertes.
- **R3** — Une inscription de l’app DOIT porter l’étiquette `client`, au nom que le client se donne auprès du service.
- **R4** — Une build qui ne lit pas le service, ou qui tourne sur iOS, NE DOIT PAS offrir les alertes.
- **R5** — Une alerte touchée DOIT ouvrir dans l’app l’article dont elle montre la page quand la lecture ou le fil le tient, et sa page sinon.
- **R6** — L’app NE DOIT PAS laisser OneSignal afficher ses propres messages, ni lire la position du téléphone.

### Conséquences

- Bien, parce que le lecteur qui les demande reçoit les alertes de la rédaction à l’heure où elle les envoie (C1).
- Bien, parce qu’un lecteur qui ne les demande pas n’envoie rien à personne : OneSignal n’est pas même chargé (C2).
- Bien, parce que le journal peut compter, exclure d’un envoi ou supprimer les inscriptions étiquetées `client` (C3).
- Bien, parce qu’une alerte touchée ouvre l’article dans le lecteur de l’app dès que la lecture ou le fil le tient (C4).
- Mauvais, parce que le journal n’a rien accordé : il peut couper ce client sans prévenir, en changeant d’application (C1).
- Mauvais, parce qu’un lecteur sur iOS n’en reçoit aucune (C1).
- Mauvais, parce qu’un lecteur qui les demande donne à OneSignal le modèle, la langue, le fuseau et l’opérateur de son téléphone (C2).

## Avantages et inconvénients des options

### Le SDK OneSignal sous l’application du journal

- Bien, parce que l’app reçoit les alertes que la rédaction choisit, à son heure (C1).
- Bien, parce que le SDK ne se charge qu’au premier « oui » du lecteur, puis à chaque lancement où ce oui tient (C2).
- Bien, parce que l’étiquette `client` range ces inscriptions à part, sous les yeux du journal (C3).
- Bien, parce que l’adresse d’une alerte nomme la page de l’article, dont le `slug` retrouve l’article dans l’app (C4).
- Mauvais, parce que le SDK est un module natif de plus, qu’iOS ne peut pas employer (C5).

### Des alertes à nous, tirées du fil par un serveur

- Bien, parce qu’un serveur à nous atteindrait aussi iOS, sous un compte Apple à nous (C1).
- Bien, parce qu’une alerte tirée du fil nommerait l’article par son identifiant, qui l’ouvre toujours dans l’app (C4).
- Mauvais, parce que ce serveur devinerait dans le fil ce qui mérite une alerte : la rédaction ne choisirait plus (C1).
- Mauvais, parce qu’il faudrait tenir ce serveur, et qu’il garderait le jeton de chaque téléphone (C2, C5).

### Des notifications locales, tirées du fil en tâche de fond

- Bien, parce que rien ne quitte le téléphone : il lit le fil comme il le lit déjà (C2).
- Mauvais, parce qu’Android espace les tâches de fond d’au moins quinze minutes, et les reporte à sa guise (C1).
- Mauvais, parce qu’un article paru ne dit pas s’il mérite une alerte : la rédaction ne choisirait plus (C1).

## Informations complémentaires

- Preuves : R1 par `guardrail/module-react-native-onesignal` ; R2 à R6 par convention, relues par les tests des alertes, du compte et des requêtes d’articles.
- La forme d’une alerte réelle reste à lire sur un téléphone doté des services de Google : aucune n’a été captée.
- Réévaluation : le journal demande à ce client de ne plus s’inscrire sous son application, ou ses alertes cessent de nommer la page d’un article.
