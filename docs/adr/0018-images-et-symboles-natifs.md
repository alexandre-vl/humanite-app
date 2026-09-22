---
format: 1
status: accepted
significance: [dependency, guarded-config, boundary]
---

# Images et symboles natifs

## Contexte et problème

- L’app affiche des photos d’articles et des icônes, mais aucune primitive ne les rend encore, alors que les vues natives sont réservées aux primitives L0 (ADR-0006).
- expo-image et expo-symbols sont les modules du SDK pour ces besoins, aux versions testées ensemble (`cat apps/mobile/node_modules/expo/bundledNativeModules.json`).
- expo-symbols rend SF Symbols sur iOS et Material Symbols sur Android depuis un seul composant (`cat apps/mobile/node_modules/expo-symbols/package.json`), mais un nom de symbole diffère par plateforme et se compte par milliers.
- Le style d’une primitive n’accepte que des valeurs de tokens brandées (ADR-0012).

Comment rendre l’image et l’icône natives sans qu’un module natif fuie hors des primitives, ni qu’un nom de symbole libre échappe au typage ?

## Critères de décision

- **C1** — Un module natif n’est importé que par une primitive L0.
- **C2** — Un composant ne nomme une icône que par une clé sémantique typée, jamais une chaîne de plateforme libre.
- **C3** — Un seul module maintenu par Expo répond à chaque besoin, aux versions du SDK.

## Options étudiées

- modules Expo confinés et registre d’icônes typé
- paquets JS d’image et d’icône

## Décision

Option retenue : « modules Expo confinés et registre d’icônes typé », parce qu’elle seule confine les modules natifs aux primitives (C1), ferme les noms d’icônes à un registre typé (C2) et prend les modules du SDK (C3).

- **R1** — expo-image et expo-symbols NE DOIVENT PAS être importées hors des primitives.
- **R2** — Un symbole de plateforme NE DOIT PAS être nommé hors du registre typé des icônes.

### Conséquences

- Bien, parce qu’une image ou une icône ne se rend que par une primitive.
- Bien, parce qu’un nom d’icône faux est une erreur de compilation.
- Mauvais, parce qu’ajouter une icône exige une entrée décrivant ses deux noms de plateforme.

## Avantages et inconvénients des options

### modules Expo confinés et registre d’icônes typé

- Bien, parce que les modules natifs restent dans les primitives L0 (C1).
- Bien, parce que le registre ferme les noms d’icônes au typage (C2).
- Bien, parce qu’expo-image et expo-symbols sont maintenus par Expo aux versions du SDK (C3).
- Mauvais, parce qu’il faut décrire chaque icône par ses deux noms de plateforme (C2).

### paquets JS d’image et d’icône

- Mauvais, parce qu’un paquet d’icônes JS s’importe depuis n’importe quelle couche (C1).
- Mauvais, parce qu’un nom d’icône y reste une chaîne libre non vérifiée (C2).
- Mauvais, parce qu’il ajoute un paquet tiers là où Expo fournit déjà le module (C3).

## Informations complémentaires

- expo-symbols exige la forme objet du nom sur Android ; le registre porte les deux noms et la primitive passe `{ ios, android }`.
- La barre d’onglets native dessine ses symboles elle-même, sans passer par la primitive : le typage du registre ne l’atteignait pas, et la règle s’arrêtait donc en deçà du critère qui la fonde.
- Les contrôles et surfaces natifs — feuilles, menus, curseurs — restent à décider dans un ADR distinct.
- Réévaluation : Expo unifie les noms de symboles entre plateformes, ou un besoin d’icône hors SF Symbols et Material Symbols apparaît.
