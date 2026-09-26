---
format: 1
status: proposed
significance: [guarded-config, reversal-cost]
---

# L’identité de l’app n’appartient qu’aux releases

## Contexte et problème

- Jusqu’à v0.1.0, chaque build de l’app s’identifiait `dev.humanite.app` : dev client, builds locales, CI et release confondus (`git show v0.1.0:apps/mobile/app.config.ts`).
- Android n’installe une app par-dessus une autre du même identifiant que si la même clé les signe (https://developer.android.com/studio/publish/app-signing#considerations). L’APK d’une release est signé par la clé de release, que seul l’environnement `release` lit (ADR-0038) ; toute autre build, par la clé de debug.
- Une build de développement sur un téléphone y bloque donc chaque release, et l’inverse : v0.1.0 a refusé de s’installer sur le téléphone du mainteneur, qui en portait une (`aapt2 dump badging humanite-0.1.0-android-arm64.apk` : `package: name='dev.humanite.app'`).
- `dev.humanite.app` se lit comme le domaine humanite.dev, qui n’est ni au journal ni au mainteneur ; l’app du journal est `com.lhuma.application` (https://play.google.com/store/apps/details?id=com.lhuma.application).
- Un autre identifiant fait une autre app : changer celui d’une app publiée coupe ses mises à jour (https://developer.android.com/build/configure-app-module#set-application-id).
- L’outillage de l’émulateur et les parcours Maestro lisent l’identifiant et le schéma dans l’APK construit (`tools/emulator/src/android/apk.ts`).

Quelle identité porte chaque build, pour qu’une build de développement et une release tiennent sur un même téléphone ?

## Critères de décision

- **C1** — une release s’installe sur un téléphone qui porte une build de développement, et l’inverse
- **C2** — aucune build signée par la clé de debug ne prend l’identité des releases, même par oubli
- **C3** — l’identifiant dit à qui est l’app, sans se confondre avec celle du journal
- **C4** — l’outillage de développement ne change pas

## Options étudiées

- Deux identités, celle des releases demandée par la release seule
- Deux identités, celle des releases par défaut et celle de développement à la demande
- Une seule identité, signée partout par la clé de release

## Décision

Option retenue : « Deux identités, celle des releases demandée par la release seule », parce qu’elle seule laisse une build de développement et une release côte à côte (C1) sans qu’un oubli donne à la clé de debug l’identité des releases (C2), sous un identifiant qui nomme le mainteneur (C3), et sans rien changer à l’outillage (C4).

- **R1** — Une build DOIT porter l’identité de développement — `alexandrevl.humanite.app.dev`, « L’Humanité dev », schéma `humanite-dev` — à moins de demander `APP_VARIANT=release`.
- **R2** — La CI NE DOIT PAS demander l’identité des releases.
- **R3** — Le workflow de release DOIT construire l’identité des releases — `alexandrevl.humanite.app`, « L’Humanité », schéma `humanite` — et refuser de publier toute autre.
- **R4** — L’identifiant des releases NE DOIT PAS changer après la première release qui le porte.

### Conséquences

- Bien, parce qu’une build de développement et une release tiennent côte à côte, chacune sous son nom (C1).
- Bien, parce qu’une build lancée sans variable prend l’identité de développement : l’oubli ne coûte rien (C2).
- Bien, parce que l’identifiant nomme le mainteneur, et que l’app du journal reste seule sous le sien (C3).
- Bien, parce que l’émulateur et Maestro suivent l’APK construit, sans une ligne changée (C4).
- Mauvais, parce que v0.1.0 ne se met pas à jour vers la suivante : qui l’a installée la désinstalle d’abord (C1).
- Mauvais, parce qu’une build de développement garde ses données à part : un abonné s’y reconnecte (C1).

## Avantages et inconvénients des options

### Deux identités, celle des releases demandée par la release seule

- Bien, parce qu’aucune build de la clé de debug ne bloque plus une release (C1).
- Bien, parce que la CI et chaque machine construisent l’identité de développement sans rien demander (C2).
- Bien, parce que `alexandrevl` nomme le mainteneur, et `.dev` la build qui n’est pas une release (C3).
- Mauvais, parce qu’une variable décide de l’identité, et que la release doit vérifier ce qu’elle construit (C2).

### Deux identités, celle des releases par défaut et celle de développement à la demande

- Bien, parce que la release se construit sans variable (C4).
- Mauvais, parce qu’une build locale lancée sans la variable prendrait l’identité des releases, et bloquerait la suivante sur le téléphone (C2).

### Une seule identité, signée partout par la clé de release

- Bien, parce que la configuration ne change pas (C4).
- Mauvais, parce que la clé de release quitterait l’environnement `release` pour chaque machine de développement (C2).
- Mauvais, parce qu’une build de développement remplacerait la release sur le téléphone, faute de tenir à côté (C1).

## Informations complémentaires

- Preuves : R2 et R3 par les fixtures `git/ci-release-identity` et `git/release-identity`, qui relisent les deux workflows (`tools/git-hooks/src/proofs/workflow.ts`) ; la release refuse en outre, à son gate, un `expo config` qui ne nomme pas `alexandrevl.humanite.app`. R1 tient par `apps/mobile/app.config.ts`, qui refuse toute autre valeur d’`APP_VARIANT` ; R4 par convention.
- Réévaluation : l’app entre sur un store qui impose sa propre signature ou son propre identifiant.
