---
format: 1
status: proposed
significance: [dependency, boundary, data-format]
supersedes: [ADR-0020]
---

# Client non officiel de l’API L’Humanité

## Contexte et problème

- L’app officielle du journal est une coquille hybride qui lit un service JSON, et non une page web : chaque écran y correspond à une route de `phenix2.immanens.com/api/v1/app/300` (capture réseau du 21/09/2026, 726 échanges, 73 réponses JSON).
- Les listes, le menu des rubriques et la recherche de ce service ne demandent aucun jeton ; seul le corps d’un article en demande un (même capture : les en-têtes d’authentification n’apparaissent que sur `wordpress/post/<id>`, `store/*` et `drm/*`).
- Le service nomme lui-même le format de chaque article — `classic`, `opinion`, `video`, `serie` — et le droit de lecture du lecteur, article par article.
- Le corps d’un article arrive dans un champ `content_array` en HTML WordPress de 45 à 76 ko, scripts et formulaire de don compris ; la prose utile y tient entre 0 et 37 paragraphes selon le format.
- Le balisage n’est pas réservé au corps : chaque chapô arrive enveloppé d’un paragraphe, et titres et légendes portent entités, italiques et exposants (`packages/contracts/src/recorded.ts`).
- La forme de ce service n’est écrite que dans une capture prise pendant qu’un lecteur était connecté : elle porte donc son identifiant, son mot de passe, ses jetons de session et la clé du client officiel (`tools/capture/src/secrets.ts`).
- ADR-0020 a écarté toute collecte parce qu’aucune source lisible n’existait ; le service que l’app officielle interroge en est une, et il sert ce que le journal publie.
- ADR-0021 a posé une porte unique pour le contenu et a nommé ce remplacement comme sa propre réévaluation (`apps/mobile/src/shared/api/content.ts`).

Comment servir au lecteur les articles que le journal publie, sans corpus inventé ?

## Critères de décision

- **C1** — le lecteur voit ce que le journal publie, dans la forme que le journal lui donne
- **C2** — les écrans, les requêtes et le cache déjà décidés ne changent pas de forme
- **C3** — les vérifications restent hors ligne et rendent le même verdict à chaque fois
- **C4** — le coût en dépendances et en poids reste mesuré

## Options étudiées

- Un client du service derrière la porte existante
- Le corpus fictif conservé et étoffé
- Une vue web sur le site du journal

## Décision

Option retenue : « Un client du service derrière la porte existante », parce qu’elle sert les articles réels sans qu’un écran change (C1, C2).

- **R1** — Une réponse du service NE DOIT PAS être servie à un écran sans avoir été relue par un schéma des contrats.
- **R2** — Un texte du service DOIT être relu avant d’atteindre une primitive : un corps en blocs des contrats, un champ court en sa ligne.
- **R3** — Un secret que porte une capture NE DOIT PAS être écrit dans un fichier suivi.
- **R4** — Le contenu simulé PEUT rester le corpus déterministe des tests et des parcours.

### Conséquences

- Bien, parce que le lecteur lit le journal du jour au lieu d’un corpus figé (C1).
- Bien, parce que la porte unique d’ADR-0021 absorbe le changement : les requêtes, les clés de cache et les écrans restent (C2).
- Bien, parce que les réponses captées servent de fixtures : les tests jugent un vrai payload sans réseau (C3).
- Bien, parce qu’une capture entre par une commande qui la lit, la taille et refuse d’écrire si elle y trouve un secret, plutôt qu’à la main (C3).
- Bien, parce que l’espace insécable que le journal écrit survit à la lecture (C1).
- Mauvais, parce que l’app dépend d’un service qu’elle ne tient pas, dont la forme peut changer sans préavis (C1).
- Mauvais, parce qu’un convertisseur de balisage entre dans le paquet, et qu’il est à tenir (C4).

## Avantages et inconvénients des options

### Un client du service derrière la porte existante

- Bien, parce que le service nomme le format et le droit de chaque article, que l’app avait dû inventer (C1).
- Bien, parce qu’un seul module change, celui qu’ADR-0021 avait réservé à cela (C2).
- Mauvais, parce que les contraintes de longueur écrites pour le corpus fictif tombent devant un vrai titre (C2).

### Le corpus fictif conservé et étoffé

- Bien, parce que rien ne dépendrait d’un service ni d’un réseau (C3).
- Mauvais, parce qu’aucun article inventé ne rend ce que le journal publie (C1).

### Une vue web sur le site du journal

- Bien, parce qu’aucun schéma ni convertisseur ne serait à écrire (C4).
- Mauvais, parce qu’une seconde liste défilante entre dans un écran, ce qu’ADR-0022 refuse (C2).
- Mauvais, parce que les tokens, les primitives et l’accessibilité déjà décidés ne s’appliqueraient plus (C2).

## Informations complémentaires

- Le service rend deux fils distincts, que l’app a déjà : `wordpress/home` dans l’ordre choisi par la rédaction, et `wordpress/homepage` en ordre strictement antéchronologique, que sa propre configuration nomme « En continu ».
- Les identifiants du corpus fictif portent la grammaire de la fiction ; ceux du service sont des nombres, et les contraintes de longueur des contrats sont écrites pour un corpus mesuré (`packages/contracts/src/ids.ts`, `packages/contracts/src/article.ts`).
- Le kiosque reste hors de l’app : un numéro pèse soixante-deux mégaoctets et se lit dans un moteur propriétaire protégé.
- La connexion du lecteur et le droit de lecture ne sont pas décidés ici ; ils font leur propre ADR, et rien de ce qui précède n’en dépend. Les images distantes non plus : rien n’en sert encore, et une règle qu’aucun outil ne tient n’est pas une règle.
- Réévaluation : le service change de forme sans préavis, ou le chemin public cesse de rendre un article lisible.
