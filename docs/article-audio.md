# Lecture audio des articles

## Parcours

Le bouton « Écouter l’article » ouvre un lecteur sombre consacré à Estelle. La première écoute explique l’envoi du texte et du jeton de lecture au serveur ; le mot de passe reste sur le téléphone. Les écoutes suivantes démarrent directement.

Le lecteur présente le titre, l’auteur, le passage en cours, un curseur pour naviguer entre les passages, les commandes précédent/suivant, les sauts de quinze secondes dans le passage et les vitesses 0,8 à 1,5. Réduire le lecteur conserve une barre compacte pendant la navigation. Les commandes natives permettent la pause depuis l’écran verrouillé. La position reprend seulement si les mots de l’article n’ont pas changé.

La synthèse anticipe deux passages. Les fichiers WAV restent dans le cache temporaire de l’app, effacé à la fermeture ou au changement de compte. Ce mécanisme nécessite une connexion pour préparer les passages suivants et ne promet pas un article complet hors connexion.

## Service

- Code : [k8s-alexvl/humanite-audio](https://github.com/k8s-alexvl/humanite-audio).
- Origine : `https://audio-humanite.alexvl.fr`.
- Pocket TTS 3.3.0, modèle français officiel à six couches, conditionnement officiel Estelle. Révisions des modèles épinglées dans le dépôt du service.
- Chaque demande contient l’identifiant de l’article et un passage de son texte. Le service interroge le journal avec le jeton du lecteur, vérifie ses droits et que les mots appartiennent à l’article avant de consulter le cache.
- Cache MinIO privé, empreinte modèle/article/texte, expiration à 30 jours. Tickets signés valables quinze minutes. Aucune clé de stockage ou de signature dans l’app.
- File bornée, un travail de synthèse à la fois, déduplication des demandes identiques et plafond de longueur. Un redémarrage peut perdre une demande en attente ; l’app la soumet à nouveau une fois.
- Une génération et son téléchargement sont bornés à deux minutes dans l’app. Le serveur attend jusqu’à vingt secondes avant de répondre sur l’avancement : le téléphone n’utilise pas de temporisation JavaScript pour surveiller les travaux en arrière-plan. Les indisponibilités temporaires sont réessayées dans ce même délai. Annulation et réponses tardives ne relancent pas une écoute arrêtée.

## Livraison

La CI du service exécute Ruff et les tests, puis publie une image GHCR privée. Elle ouvre une PR dans le cluster avec le commit et le digest immuables de l’image. La promotion n’accepte que le changement de cette seule ligne et attend les six contrôles du cluster. Argo CD suit ensuite la branche principale.

Le déploiement initial utilise deux cœurs CPU, avec cache de modèles sur PVC. Le GPU du serveur est déjà alloué à Jellyfin ; aucune ressource GPU n’est retirée à ce service. Les secrets sont gérés par Sealed Secrets.

## Mesures et limites

Le modèle officiel sur le Mac de développement produit 4 secondes de son en 0,94 seconde, puis 2,08 secondes en 0,25 seconde et 4,72 secondes en 0,60 seconde. Ces mesures portent sur le Mac et ne prédisent pas la vitesse du serveur.

L’essai précédent utilisait un export ONNX français à 24 couches, 354 179 076 octets de modèles et une génération locale. Le moteur, ses poids et sa dépendance ONNX sont retirés de l’app dans la version serveur. Les fonctionnalités du lecteur natif et la correction des bords du panneau iOS sont conservées.

Sur le serveur déployé, avec deux threads CPU, un passage de 14,88 secondes a été disponible en 9,74 secondes via HTTPS, droits, file et attente compris. Son téléchargement a pris 0,35 seconde ; la demande suivante a obtenu le résultat en cache en 0,42 seconde. Ce sont des observations individuelles, pas une mesure de capacité sous charge.

Sur le Nothing A065 sous Android 16, le premier son d’une lecture sans cache a démarré après 5,4 secondes. La build de développement contient le module audio et la visionneuse native ; la version de release du téléphone est conservée. Les commandes système de pause et de reprise ont été exercées sur le lecteur actif. Le simulateur iPhone est resté éteint.

## Vérification

- Tests du contrôleur : annulation, pause pendant la préparation, commandes natives, changement d’article, restauration de position, reprise après erreur et exclusion d’un corps retenu.
- Tests de l’API : renouvellement du jeton, une seule réouverture après expiration, reprise d’un travail perdu, refus des tickets malformés, absence d’écriture après annulation.
- Tests du service : accès même en cache, déduplication, limites, expiration et falsification de tickets, redémarrage et renouvellement du jeton du journal.
- `pnpm verify` reste le contrôle complet de l’app. Les mesures et essais sur le serveur et le téléphone sont consignés après leur exécution.
