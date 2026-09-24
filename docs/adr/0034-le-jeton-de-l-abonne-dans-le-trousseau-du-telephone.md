---
format: 1
status: proposed
significance: [guarded-config, boundary]
---

# Le jeton de l’abonné dans le trousseau du téléphone

## Contexte et problème

- Le jeton d’usager prouve au service que l’abonnement est celui du lecteur, et ADR-0032 ouvre la connexion qui le rend (`docs/adr/0032-la-connexion-de-l-abonne-sous-une-cle-pretee.md`).
- Tout ce que l’app garde va dans MMKV, un fichier du répertoire de l’app, en clair (`apps/mobile/src/shared/lib/storage/storage.ts`).
- Mesuré le 24/09/2026 sur le téléphone : `adb shell run-as dev.humanite.app cat files/mmkv/humanite | strings` rend les clés et les valeurs de ce magasin, jeton compris.
- Le client du service demande le jeton à chaque requête, de façon synchrone, sans promesse à attendre (`packages/remote-api/src/transport.ts`).
- `expo-secure-store` lit et écrit de façon synchrone, et ne supprime qu’en asynchrone (`deleteItemAsync`, `getItem`, `setItem`).

Où l’app garde-t-elle le seul secret qu’elle détienne ?

## Critères de décision

- **C1** — le jeton ne se lit pas en clair sur le téléphone
- **C2** — le client le demande sans promesse, à chaque requête
- **C3** — un abonné connecté avant la mise à jour l’est encore après
- **C4** — une seule place ouvre le secret, et une règle le tient

## Options étudiées

- Le trousseau de la plateforme, lu en synchrone
- Le magasin en clair, chiffré par une clé que l’app porte
- Le magasin en clair, comme le reste de ce que l’app garde

## Décision

Option retenue : « Le trousseau de la plateforme, lu en synchrone », parce que la clé qui l’ouvre est tenue par un matériel que l’app ne lit ni ne copie (C1), et qu’il répond sans promesse, ce que le client exige (C2).

- **R1** — Le jeton de l’abonné DOIT être gardé dans le trousseau de la plateforme.
- **R2** — Le trousseau NE DOIT PAS s’ouvrir ailleurs que dans la place `lib`.
- **R3** — Une suppression du jeton DOIT l’écraser avant de demander l’effacement.

### Conséquences

- Bien, parce qu’un téléphone rooté, une sauvegarde ou une image du disque rendent le magasin en clair et pas celui-ci (C1).
- Bien, parce que le client garde son port synchrone : rien du transport ne change pour que le jeton déménage (C2).
- Bien, parce que le jeton laissé par une build précédente est repris au premier démarrage et effacé là où il était (C3).
- Bien, parce que la lisibilité du secret tient à une règle de lint et non à la mémoire de qui écrit (C4).
- Mauvais, parce qu’un module natif de plus oblige à rebâtir le client de développement avant tout essai.
- Neutre, parce que la suppression reste asynchrone sous le capot : ce qui est immédiat est l’écrasement, et c’est lui qui compte.

## Avantages et inconvénients des options

### Le trousseau de la plateforme, lu en synchrone

- Bien, parce que la clé vit dans le Keystore d’Android ou le Keychain d’iOS, hors d’atteinte de l’app elle-même (C1).
- Bien, parce que `getItem` répond sans promesse, donc le lecteur se lit au premier trait comme avant (C2).
- Bien, parce qu’une seule place l’importe, ce qu’une politique de module refuse partout ailleurs (C4).
- Mauvais, parce qu’il faut rebâtir le client de développement pour l’essayer (C2).

### Le magasin en clair, chiffré par une clé que l’app porte

- Bien, parce que rien de natif ne s’ajoute, et qu’aucune build n’est à refaire (C2).
- Mauvais, parce que la clé serait dans le paquet : qui lit le fichier lit aussi de quoi l’ouvrir (C1).
- Mauvais, parce qu’il faudrait décider où cette clé vit, ce qui est la même question déplacée d’un cran (C4).

### Le magasin en clair, comme le reste de ce que l’app garde

- Bien, parce que c’est ce qui existe, et que rien n’est à écrire (C2, C3).
- Mauvais, parce que le jeton s’y lit comme une préférence, mesuré sur le téléphone (C1).
- Mauvais, parce que rien n’empêcherait le prochain secret d’y aller aussi (C4).

## Informations complémentaires

- Preuves : R2 a son juge, une page qui ouvre elle-même le trousseau (`tools/guardrails/src/proofs/app.ts`). R1 et R3 n’en ont pas : aucun banc hors ligne ne lit ce qu’un téléphone garde.
- Le trousseau tient l’entrée pour ce téléphone seul et pour le temps qu’il est déverrouillé, un jeton restitué d’une sauvegarde sur un autre appareil connectant un inconnu sous le nom de l’abonné.
- Réévaluation : la plateforme rend la lecture du trousseau asynchrone, ou le service lie le jeton à l’appareil qui l’a obtenu.
