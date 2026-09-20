# Phase 3 — relevés sur appareil

Ce que le téléphone a répondu, et quand. Les seuils vivent dans `tools/perf/src/budgets.ts` ; ce journal porte ce qui a
été mesuré contre eux. Rien ici n'est une décision : ce qui décide est dans ADR-0025.

## Session du 20/09/2026, 20 h 52

| Fait | Valeur |
| --- | --- |
| Appareil | A065, Android 16, API 36, `arm64-v8a` |
| Écran | 3 modes (120, 90, 60 Hz), **rendu en vigueur 90 Hz** |
| Paquet | `dev.humanite.app`, `versionName=0.0.0`, installé le 18/09/2026 19 h 56 |
| Build | **`DEBUGGABLE`** — servi par Metro, ce n'est pas le programme qu'un lecteur installe |
| Commit mesuré | branche `phase-0c`, après C·5 |

```text
✗ perf/debuggable-refused    le paquet mesuré est debuggable
✓ lancement à froid          897 ms                (budget 1 500 ms)
✗ défilement                 1,07 % de 1 032 images hors échéance (budget 1 %)
· écran                      90 Hz
```

**Aucun de ces deux nombres ne compte.** L'outil refuse la session entière, et il a raison : un build de développement
porte le pont de débogage, sert son bundle depuis un serveur et ne subit ni le raccourcissement ni l'optimisation que
subit un build livré. Les nombres sont notés parce qu'ils disent l'ordre de grandeur, pas parce qu'ils répondent.

## Ce que la session a corrigé dans l'outil

La lecture de `dumpsys display` était écrite d'après la documentation d'Android et n'avait jamais vu d'appareil. Elle
cherchait un nombre suivi de `fps` ; l'appareil écrit `fps=120.00001`, le nombre après. Elle aurait de toute façon
retenu le mode le plus rapide — 120 Hz — alors que l'écran rendait l'app à 90. Toute mesure aurait été classée sous une
fréquence que l'app n'a jamais vue, et rien ne l'aurait dit.

Le refus est ce qui l'a révélé : la lecture a échoué au lieu de rendre un nombre. C'est la règle R1 d'ADR-0025 en
fonctionnement, sur sa première session réelle.

## Ce qui reste à mesurer

Un build release, que l'outillage ne sait pas encore produire : la chaîne Gradle est câblée sur `assembleDebug` et
`x86_64`, et `minifyEnabled` est faux parce que la propriété qui l'active n'est définie nulle part. Tant que cela dure,
aucune session ne peut passer `perf/debuggable-refused`, ce qui est exactement ce qu'on attend d'elle.

## Défauts trouvés en regardant l'écran, le 20/09/2026

| # | Défaut | Mesure | État |
| --- | --- | --- | --- |
| 1 | L'interrupteur des préférences était invisible : piste et curseur tirés des rôles d'un filet et d'une feuille | 1,13:1 en clair, 1,32:1 en sombre, contre les 3:1 que WCAG 1.4.11 demande d'un composant | corrigé, remesuré à 3,62 · 3,83 · 4,81 · 8,00 |
| 2 | « Très grand » remplissait sa cellule bord à bord au plus grand cran, dans la face des lecteurs qui en ont besoin | 1 px à gauche, 3 px à droite | corrigé, le libellé passe à la ligne, marges 59 à 74 px |
| 3 | La lecture de la fréquence d'écran ne reconnaissait pas un vrai appareil | — | corrigé sur la réponse réelle, gardée en fixture |

## Ce que l'appareil a confirmé

Le fronton se replie et les deux bandes restent épinglées · le thème et le cran traversent tout le journal sous le doigt
· les barres système suivent le thème · le retour système dépile au lieu de fermer l'app · le marque-page est sur les
cartes de rubrique et de recherche · les liens hors du journal et le bouton de l'encart ouvrent le navigateur · le
papier des encarts est incliné de 1,30° et 1,37°, pour 1,4° demandé · un marque-page posé à la session précédente a
survécu à la fermeture de l'app.
