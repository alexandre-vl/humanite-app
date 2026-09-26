# Contribuer

Ce dépôt est un projet personnel d'apprentissage : une reconstruction native, **non officielle**, de l'app de
_L'Humanité_. Une contribution y est bienvenue, sous les règles que le dépôt fait respecter lui-même — chacune écrite
dans un [ADR](docs/adr/README.md) et tenue par un outil.

## Avant d'écrire du code

- **Un bug** : une issue, avec le modèle « Bug ».
- **Une idée qui touche une règle du dépôt** : une issue d'abord. Chaque décision structurante vit dans un ADR ; un
  ADR se propose (`pnpm adr:new`), et seul le mainteneur le décide (`pnpm adr:decide` est réservé au décideur humain).
- **Une faille** : jamais dans une issue publique, voir [SECURITY.md](SECURITY.md).

## Installer

```bash
pnpm install          # pnpm 11.27.1 ; Node 24.21.0, que pnpm télécharge au besoin
pnpm hooks:install    # les hooks git du dépôt, sans lesquels pnpm verify échoue
pnpm verify           # tous les contrôles, dans l'ordre
```

Sans aucune variable d'environnement, l'app lit le corpus fictif de `packages/mock-content` : c'est ainsi qu'on la
développe et qu'on la teste. Lancer l'app sur iOS ou Android : [README, « Démarrer »](README.md#démarrer).

La connexion de l'abonné n'est pas ouverte aux contributions : elle passe sous une clé prêtée au mainteneur pour ses
tests, qui ne se partage pas ([ADR-0032](docs/adr/0032-la-connexion-de-l-abonne-sous-une-cle-pretee.md)).

## Écrire un commit

- `pnpm verify` passe. Le pre-commit rejoue sur l'index les étapes que le commit concerne, et l'index doit contenir
  tout l'arbre de travail.
- Le message suit Conventional Commits, en-tête de 100 caractères au plus : `type(portée): sujet`.
  - Types : `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `chore`, `revert`, `style`.
  - Portées : le dossier d'un paquet sous `apps/`, `packages/` ou `tools/`, ou `repo`, `spikes`.
- Un trailer `Refs: ADR-NNNN` par ADR accepté dont le périmètre couvre un chemin du commit : le hook `commit-msg` les
  calcule et refuse un commit qui en oublie. Seuls `Refs`, `Co-authored-by` et `BREAKING-CHANGE` sont acceptés.
- Jamais `--no-verify` : la CI rejoue tout, l'historique des messages compris, et un commit qui a contourné les hooks
  y échoue.

Les commandes du dépôt, chacune avec son rôle : [AGENTS.md](AGENTS.md). Un agent (Claude Code) y travaille sous la même
garde qu'en local.

## Proposer une pull request

- Une PR, un sujet : ce qui change, pourquoi, et comment c'est vérifié — une capture du simulateur pour un écran.
- La CI doit être verte : `pnpm verify`, la recherche de secrets dans tout l'historique, les builds Android et iOS.
- Pas de commit de fusion : la PR est fusionnée par rebase et l'historique reste linéaire. Mettez votre branche à jour
  par `git rebase`, jamais par un merge ni par le bouton « Update branch » en mode merge.

## Ce qui n'entre jamais dans le dépôt

- **Un secret** : clé, jeton, identifiant, mot de passe, même expiré. L'identité que l'app présente au service passe au
  build par les variables `EXPO_PUBLIC_*`, jamais par un fichier suivi. La CI cherche les secrets dans tout
  l'historique, et GitHub bloque au push ceux qu'il reconnaît.
- **Un contenu du journal** : article, photo, capture d'écran de l'app officielle. Les tests, les exemples et les
  captures d'une PR s'en tiennent au corpus fictif.

## Licence des contributions

Le dépôt est publié sous la [PolyForm Noncommercial License 1.0.0](LICENSE). En proposant une contribution, vous
certifiez en être l'auteur ou avoir le droit de la proposer, et vous accordez au mainteneur une licence perpétuelle,
mondiale, gratuite, non exclusive et irrévocable d'utiliser, de modifier, de sous-licencier et de distribuer votre
contribution, y compris sous d'autres conditions que celles de la licence du dépôt, commerciales comprises. Elle reste
publiée dans le dépôt sous la même licence que lui.

## Conduite

Chacun ici suit le [code de conduite](CODE_OF_CONDUCT.md).
