<!-- Généré par pnpm adr:index depuis docs/adr, tools/adr/src/spec.ts et tools/adr/src/bindings.ts : ne pas modifier à la main. -->

# Décisions d’architecture

Chaque décision structurante est consignée dans un ADR. Un ADR accepté ou rejeté ne change plus ; ses preuves et son périmètre, qui évoluent avec le code, sont tenus dans `tools/adr/src/bindings.ts`.

## Registre

| ADR | Titre | Statut | Importance |
| --- | ----- | ------ | ---------- |

## Confirmation

Aucun ADR n’a encore de liens vers ses preuves.

## Référentiel

Valeurs en vigueur de `tools/adr/src/spec.ts`.

### Statuts

| Statut     | Transitions                  |
| ---------- | ---------------------------- |
| `proposed` | `accepted`, `rejected`       |
| `accepted` | aucune : le fichier est figé |
| `rejected` | aucune : le fichier est figé |

Un ADR accepté devient `superseded`, sans modification de son fichier, dès qu’un ADR accepté le cite dans `supersedes`.

### Importance

| Valeur           | Sens                                                                                                 | Détection   |
| ---------------- | ---------------------------------------------------------------------------------------------------- | ----------- |
| `dependency`     | ajoute, retire ou remplace une dépendance                                                            | automatique |
| `guarded-config` | modifie une configuration gardée : TypeScript, ESLint, Prettier, catalog pnpm, hooks, .claude, tools | automatique |
| `boundary`       | crée ou modifie une frontière : couche, package, champs exports ou imports                           | automatique |
| `data-format`    | change un contrat de données ou un format persistant                                                 | automatique |
| `reversal-cost`  | coûte plus d’une journée à défaire                                                                   | relecture   |

### Sections

1. Contexte et problème
2. Critères de décision
3. Options étudiées
4. Décision, avec la sous-section Conséquences
5. Avantages et inconvénients des options
6. Informations complémentaires

### Limites

- 900 mots au plus, hors blocs de code.
- Titre de 60 caractères au plus.
- 2 options étudiées au moins.

### Contrôles

| Code                        | Portée     | Vérifie                                                               |
| --------------------------- | ---------- | --------------------------------------------------------------------- |
| `adr/path`                  | fichier    | fichier nommé docs/adr/NNNN-slug.md, aucun autre fichier ni dossier   |
| `adr/encoding`              | fichier    | UTF-8 valide, sans BOM, normalisé NFC                                 |
| `adr/frontmatter-yaml`      | fichier    | en-tête YAML 1.2 présent, sans erreur ni avertissement                |
| `adr/frontmatter-schema`    | fichier    | en-tête conforme au schéma du format                                  |
| `adr/frontmatter-canonical` | fichier    | en-tête écrit sous sa forme canonique unique                          |
| `adr/markdown-subset`       | fichier    | seuls les éléments Markdown autorisés sont utilisés                   |
| `adr/title`                 | fichier    | un seul titre de niveau 1, court, sans « : » ni ponctuation finale    |
| `adr/slug`                  | fichier    | nom de fichier dérivé du titre                                        |
| `adr/sections`              | fichier    | sections MADR traduites, toutes présentes, dans l’ordre               |
| `adr/context`               | fichier    | faits sourcés puis une seule question                                 |
| `adr/criteria`              | fichier    | critères C1…Cn numérotés sans trou                                    |
| `adr/options`               | fichier    | au moins deux options, reprises à l’identique en section 5            |
| `adr/decision`              | fichier    | option retenue parmi les options, règles R1…Rn dont une contraignante |
| `adr/keywords`              | fichier    | un mot-clé DOIT, NE DOIT PAS ou PEUT par règle, aucun ailleurs        |
| `adr/valence`               | fichier    | puces Bien, Neutre ou Mauvais « parce que », coûts nommés             |
| `adr/criteria-cited`        | fichier    | chaque argument cite un critère existant, chaque critère est cité     |
| `adr/reevaluation`          | fichier    | un déclencheur de réévaluation                                        |
| `adr/words`                 | fichier    | 900 mots au plus, hors blocs de code                                  |
| `adr/link-target`           | fichier    | les liens relatifs visent un fichier existant                         |
| `adr/number-unique`         | collection | un numéro par ADR                                                     |
| `adr/references`            | collection | remplacements et mentions visent des ADR existants et valides         |
| `adr/index`                 | collection | index docs/adr/README.md régénéré à l’identique                       |
| `adr/bindings`              | dépôt      | chaque règle contraignante acceptée est liée à des preuves            |
| `adr/scope`                 | dépôt      | chaque périmètre couvre au moins un fichier                           |
| `adr/history`               | historique | historique git complet disponible                                     |
| `adr/transitions`           | historique | statuts : proposed d’abord, puis une seule décision définitive        |
| `adr/frozen`                | historique | un ADR décidé ne change plus                                          |
| `adr/no-deletion`           | historique | un ADR commité n’est jamais supprimé                                  |
| `adr/accept-proofs`         | historique | un ADR accepté dans l’index a des preuves qui passent                 |
