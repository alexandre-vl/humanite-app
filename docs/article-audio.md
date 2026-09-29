# Lecture audio des articles

## Parcours

Le bouton « Écouter l’article » ouvre un lecteur sombre consacré à Estelle. La première écoute explique l’envoi du texte et du jeton de lecture au serveur ; le mot de passe reste sur le téléphone. Les écoutes suivantes démarrent directement.

Le lecteur présente le titre, l’auteur, le passage en cours, un curseur pour naviguer entre les passages, les commandes précédent/suivant, les sauts de quinze secondes dans le passage et les vitesses 0,8 à 1,5. Réduire le lecteur conserve une barre compacte pendant la navigation. Les commandes natives permettent la pause depuis l’écran verrouillé. La position reprend seulement si les mots de l’article n’ont pas changé.

La version continue remplace les WAV successifs par une seule source HLS native. La position et les sauts de quinze secondes portent sur l’article entier. Les paragraphes sont des repères de navigation ; leur transition ne recharge jamais le lecteur. Pendant la génération, la durée affichée est celle déjà disponible, et la suite est annoncée comme en préparation.

Le serveur prépare le texte dans l’ordre. Le lecteur natif maintient une réserve d’environ vingt secondes et continue de recevoir l’audio lorsque JavaScript est suspendu. Une connexion reste nécessaire. Les fragments privés ne constituent pas un téléchargement hors connexion géré par l’app.

## Service

- Code : [k8s-alexvl/humanite-audio](https://github.com/k8s-alexvl/humanite-audio).
- Origine : `https://audio-humanite.alexvl.fr`.
- Pocket TTS 3.3.0, modèle français officiel à six couches, conditionnement officiel Estelle. Révisions des modèles épinglées dans le dépôt du service.
- La session v2 contient l’identifiant de l’article et ses paragraphes. Le service interroge le journal une fois, vérifie les droits et l’appartenance des paragraphes dans leur ordre avant de consulter le cache. Une nouvelle session renouvelle cette vérification.
- Cache MinIO privé, versionné par modèle, traitement du texte, article et paragraphes. Tickets HMAC valables une heure ; aucune clé dans l’app. Le manifeste final est écrit après les fragments et les repères, pour éviter un cache partiel présenté comme terminé.
- Génération PCM progressive, un encodeur AAC pour l’article entier, fragments HLS fMP4 d’environ une seconde. Les petites frontières de transport ne réinitialisent pas l’encodeur.
- Découpage serveur aux fins de phrases, puis aux propositions si nécessaire, sous la limite de tokens du modèle. Aucun second découpage côté app.
- Un travail de synthèse à la fois ; ordonnanceur entre les fragments linguistiques des sessions. Limites sur les admissions, la longueur du document, sa durée et les sessions inactives.
- Les métadonnées suivent la génération avec une attente côté serveur. Leur indisponibilité ne stoppe pas la lecture native déjà en cours.
- Fermeture et changement de compte ferment le lecteur et invalident les réponses tardives. La position ne reprend que pour le même texte.
- Un patch ciblé d’expo-audio applique la réserve explicite après remplacement de la source sur iOS et règle le seuil initial Android à 750 ms (1,5 s après une interruption). La réserve de lecture reste distincte de ce seuil.
- L’API v1 reste disponible côté serveur pendant la migration de l’app.

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

## Qualification de la lecture continue

Les tests précédents validaient le fonctionnement, sans prouver la fluidité perçue. La qualification v2 distingue le temps jusqu’au premier fragment, le démarrage natif, les interruptions de transport et la qualité de la parole.

Premiers essais du 29 septembre 2026, à confirmer sur la version finale :

- Serveur de développement sur Mac : premier manifeste disponible en 1,21 s, contrôle des droits compris.
- Nothing A065, même serveur via USB : début de lecture native à 2,39 s sans cache ; 59,4 s lues jusqu’au bout sans erreur. Version native avant ajustement du seuil de départ.
- Serveur Kubernetes CPU, image candidate isolée du Service : premier manifeste disponible en 2,00 s par tunnel. Cette mesure ne comprend pas le lecteur ni le chemin public Cloudflare.
- Nothing A065, serveur Kubernetes CPU via tunnel et nouveau seuil natif : début de lecture à 3,218 s sans cache ; 61,962 s lues jusqu’au bout, aucune erreur et aucun retour en attente après le départ. Il s’agit des événements du lecteur, pas d’une mesure acoustique au haut-parleur.
- GTX 1650, test de cohabitation : Jellyfin encode 90 s de vidéo synthétique H.264 1080p30 pendant que Pocket TTS français six couches produit 5,81 s d’audio par seconde ; médiane du premier PCM 40,6 ms. Modèle 24 couches : 2,36 fois le temps réel et 92,8 ms. Banc Torch 2.6/cu124 ; l’image destinée à la production utilise un environnement distinct à qualifier. Ces mesures ne comprennent ni réseau ni lecteur.
- La RX 5600 XT dispose d’environ 6 Go de mémoire ; le pilote Mesa initialise VA-API et expose des profils de décodage/encodage. Aucun basculement de Jellyfin sur AMD n’a été fait.
- Le texte brut « 12,5 % » tronquait une phrase de contrôle avec les deux modèles. Une normalisation déterministe des nombres, après vérification du texte original, rétablit la fin de phrase dans la transcription Whisper-small de contrôle. Ce diagnostic ne valide pas à lui seul le naturel de la voix.
- Les métadonnées de progression reprennent après les erreurs réseau temporaires ; leur attente et leur annulation restent indépendantes du flux natif. Le délai de requête couvre aussi la lecture du corps de réponse.

Critères de livraison visés : premier son médian inférieur à 1,5 s, 95e percentile inférieur à 3 s sur connexion stable et modèle chaud ; aucune rupture technique ajoutée entre paragraphes ; écoute prolongée et commandes système vérifiées sur téléphone. Ces seuils sont des objectifs, pas des résultats acquis.
