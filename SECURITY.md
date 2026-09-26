# Sécurité

## Signaler une faille

Jamais dans une issue publique. Signalez-la en privé, par GitHub :
[**Report a vulnerability**](https://github.com/alexandre-vl/humanite-app/security/advisories/new), sous l'onglet
_Security_ du dépôt. À défaut, écrivez au mainteneur, [@alexandre-vl](https://github.com/alexandre-vl), à l'adresse
de contact de son profil GitHub.

Dites ce qui est touché, comment le reproduire, et ce qu'un attaquant en tirerait. C'est un projet personnel, sans
astreinte ni prime : chaque signalement privé est lu, et une faille confirmée est corrigée avant d'être rendue publique.

## Périmètre

- **Dans le périmètre** : le code de ce dépôt — l'app, ses paquets, l'outillage, les hooks et la CI.
- **Hors du périmètre** : le service du journal et le site humanite.fr. Ce dépôt est un client non officiel de ce
  service ; une faille du service se signale au journal, pas ici.
- **Un secret trouvé** dans un fichier ou dans l'historique se signale en privé, même s'il semble expiré.

Seules `main` et la dernière release sont maintenues. L'app n'est sur aucun store : ses versions sortent en
[releases](https://github.com/alexandre-vl/humanite-app/releases), sans clé ni connexion d'abonné.

## Ce que le dépôt fait déjà

- Aucun secret n'est suivi : l'identité que l'app présente au service passe au build par les variables
  `EXPO_PUBLIC_*` ([ADR-0032](docs/adr/0032-la-connexion-de-l-abonne-sous-une-cle-pretee.md)), et la lecture d'une
  capture réseau refuse d'écrire un jeton, un mot de passe, une adresse, un cookie ou une clé
  (`tools/capture/src/secrets.ts`).
- À chaque push et à chaque pull request, la CI cherche les secrets dans tout l'historique avec gitleaks ; GitHub
  bloque au push les secrets qu'il reconnaît.
- CodeQL relit le code à chaque push et à chaque pull request, et une pull request qui ouvre une alerte n'entre pas
  dans `main` ([ADR-0038](docs/adr/0038-le-depot-public-se-verifie-et-se-publie-sur-le-serveur.md)).
- Les actions de la CI sont épinglées par SHA, et son jeton ne fait que lire.
- Un APK de release est signé par une clé privée, que seul le job de release lit, depuis un tag `v*`. Le certificat a
  pour empreinte SHA-256 `b58a1ae9db2379bea06357aa187bed8ffd3b9f6c879ad8e522d6a4058879971e` : un APK signé par une
  autre clé n'est pas l'un des nôtres. Chaque binaire porte une attestation de provenance
  (`gh attestation verify <fichier> -R alexandre-vl/humanite-app`).
- Le jeton de l'abonné vit dans le trousseau du téléphone
  ([ADR-0034](docs/adr/0034-le-jeton-de-l-abonne-dans-le-trousseau-du-telephone.md)).
- Un article réservé ne s'ouvre que sur le droit que le service accorde : le serveur n'envoie aucun corps sans ce
  droit, et l'app n'en ouvre aucun
  ([ADR-0032](docs/adr/0032-la-connexion-de-l-abonne-sous-une-cle-pretee.md)).
