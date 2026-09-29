# Visionneuse Android

Module Expo local, découvert automatiquement au build. `NativePicture` enveloppe l’image Expo dans une primitive ; le clic Android lance une activité transparente dédiée. L’article reste monté derrière elle.

## Comportement

- Le drawable déjà affiché fournit le premier cadre. Sa matrice et son découpage sont interpolés jusqu’à l’image entière, puis vers la source à la fermeture.
- `ScaleGestureDetector`, `GestureDetector` et `OverScroller` assurent le pincement de 1× à 4×, le double tap centré sur le doigt, le déplacement borné et son inertie.
- Un tap masque les commandes, la légende et les barres système. Un glissement vertical ferme la photo lorsqu’elle n’est pas zoomée.
- L’activité photo seule active le retour prédictif : progression et annulation sur Android 14+, retour système sur les versions précédentes. Le réglage de l’activité React Native reste inchangé.
- TalkBack dispose des actions agrandir, réduire, commandes et fermer. Les textes proviennent du dictionnaire de l’app.
- Glide charge une copie limitée à 4096 pixels par côté, sans agrandir les petits fichiers au décodage. La copie remplace la miniature au repos, pour éviter de déplacer le point regardé pendant un geste.
- Le démontage de la source, son changement d’adresse ou la destruction de l’activité libèrent la session et la requête Glide. Une restauration après arrêt du processus revient à l’article.

Le module ne persiste rien et n’exporte pas d’activité vers les autres applications. Une modification Kotlin nécessite un nouveau dev client ; un rafraîchissement Metro ne suffit pas.

## Vérifier sur un téléphone

Depuis `apps/mobile/android`, avec le SDK Android configuré et un seul appareil cible sélectionné par `ANDROID_SERIAL` :

```sh
./gradlew :huma-picture-viewer:connectedDebugAndroidTest :app:assembleDebug -PreactNativeArchitectures=arm64-v8a
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Les sept tests instrumentés exercent les vrais détecteurs Android : cadrage et redimensionnement, pincement et limites, double tap, annulation et fermeture au glissement, déplacement zoomé, priorité du retour prédictif et actions d’accessibilité. Ils ne dépendent pas de Metro.

Le parcours `apps/mobile/e2e/picture.yaml` vérifie ensuite l’intégration dans l’app avec Maestro et les variables `APP_ID` et `DEV_CLIENT_LINK`, comme les autres parcours. Il conserve les données de l’application.

À contrôler visuellement sur l’appareil : continuité du cadrage aux deux extrémités, retour prédictif interrompu, remise au premier plan et source partiellement visible. `pnpm verify` contrôle la partie TypeScript et le dépôt ; les tests instrumentés se lancent séparément.

## Maintenance

La version Glide suit celle de `expo-image`. Le code natif reste sous `modules/`, hors du dossier Android généré. L’ADR-0045 décrit la frontière avec les primitives.
