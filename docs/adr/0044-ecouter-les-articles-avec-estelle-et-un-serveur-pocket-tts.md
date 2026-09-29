---
format: 1
status: proposed
significance: [dependency, boundary, data-format, reversal-cost]
---

# Écouter les articles avec Estelle et un serveur Pocket TTS

## Contexte et problème

- Le lecteur demande la voix Estelle de la démonstration officielle sur iOS et Android ([spécification](../article-audio.md)).
- L’essai ONNX français à 24 couches sur téléphone consomme trop de temps et de mémoire pour accompagner confortablement la lecture. Le lecteur a demandé de déplacer la synthèse sur son infrastructure Kubernetes ([historique](../article-audio.md)).
- Pocket TTS 3.3.0 fournit le modèle français officiel à six couches et le conditionnement Estelle. Le service est développé dans [humanite-audio](https://github.com/k8s-alexvl/humanite-audio).
- Le téléphone possède déjà les droits et le texte reçus du journal. Un cache audio ne doit pas ouvrir les articles réservés à un autre lecteur (`cat packages/contracts/src/article.ts`).

Comment proposer une lecture naturelle qui démarre rapidement, conserve les droits du journal et accompagne la navigation ?

## Critères de décision

- **C1** — conserver la voix officielle Estelle et commencer sans installer un modèle
- **C2** — continuer la lecture pendant la navigation et permettre pause, reprise et changement de vitesse
- **C3** — annuler les réponses tardives et effacer l’audio temporaire au changement de lecteur
- **C4** — contrôler les droits avant de fournir un passage, même déjà présent en cache

## Options étudiées

- Pocket TTS officiel sur un serveur avec cache privé
- Export ONNX français sur le téléphone
- Synthèse vocale du système

## Décision

Option retenue : « Pocket TTS officiel sur un serveur avec cache privé », parce qu’elle conserve Estelle sans charger un modèle sur chaque téléphone (C1), et centralise un cache soumis aux droits du lecteur (C4). La session invalide les réponses tardives (C3).

- **R1** — Les requêtes de synthèse DOIVENT passer par `shared/api` vers l’origine HTTPS fixe du service audio.
- **R2** — Avant la première écoute, l’interface DOIT expliquer que le texte et le jeton de lecture sont transmis au serveur pour vérifier les droits et préparer l’audio.
- **R3** — Le serveur DOIT vérifier auprès du journal les droits du lecteur et l’appartenance du passage à l’article avant tout résultat, y compris en cache.
- **R4** — La fermeture du lecteur ou le changement de compte DOIT annuler la session et effacer son audio temporaire.
- **R5** — Un article au corps retenu NE DOIT PAS proposer la lecture audio.
- **R6** — La position persistée DOIT être invalidée quand le texte change.

### Conséquences

- Bien, parce que le téléphone ne télécharge plus les 354 Mo du modèle ONNX (C1).
- Bien, parce qu’un lecteur natif unique gère les passages et les commandes de l’écran verrouillé, et ferme sa session au changement de compte (C2, C3).
- Bien, parce que le cache MinIO est privé et les tickets audio signés ont une durée limitée (C4).
- Mauvais, parce qu’une connexion est nécessaire pour préparer les passages suivants (C1).
- Mauvais, parce que le serveur devient dépositaire temporaire du texte et du jeton du lecteur (C4).
- Mauvais, parce que deux passages anticipés ne constituent pas un téléchargement intégral hors connexion (C2).

## Avantages et inconvénients des options

### Pocket TTS officiel sur un serveur avec cache privé

- Bien, parce que le contrôleur annule la session et efface les fichiers au changement de lecteur (C3).
- Bien, parce que la voix et les révisions des modèles sont fixées et testables indépendamment de l’app (C1).
- Bien, parce que la publication GHCR et la promotion d’image contrôlée dans Git précèdent le déploiement Argo CD (C4).
- Mauvais, parce que la capacité de la file de synthèse limite les écoutes simultanées (C2).

### Export ONNX français sur le téléphone

- Bien, parce que le texte reste local et qu’un modèle installé permet l’écoute sans réseau (C4).
- Mauvais, parce que l’export testé à 24 couches est trop coûteux sur le téléphone de test (C1, C2).

### Synthèse vocale du système

- Bien, parce que les plateformes fournissent les voix installées (C1).
- Mauvais, parce qu’elles ne fournissent pas Estelle (C1).

## Informations complémentaires

- Le service démarre sur CPU pour ne pas retirer le GPU déjà alloué à Jellyfin. Un déploiement CUDA nécessite une image adaptée et une décision de partage des ressources.
- Preuves : `controller.test.ts`, `speech.test.ts`, tests du service et mesures décrites dans `docs/article-audio.md`.
- Réévaluation : attente mesurée trop longue sur le serveur, besoin d’écoute intégrale hors connexion ou modèle local français assez léger.
