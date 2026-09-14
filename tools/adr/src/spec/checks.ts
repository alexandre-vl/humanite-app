import type { CheckDetailsOf } from '@huma/kit/checks';
import { defineChecks } from '@huma/kit/checks';

/**
 * Every finding `adr:check` can report, one code per rule. A message says what was found, then what is expected;
 * `{name}` placeholders are filled by the check that reports it, with types derived from the template. Each code is
 * proven by at least one fixture, and the index lists them all.
 */

export const CHECK_SCOPES = ['file', 'collection', 'repository', 'history'] as const;

export type CheckScope = (typeof CHECK_SCOPES)[number];

export const CHECK_SCOPE_LABELS = {
  file: 'fichier',
  collection: 'collection',
  repository: 'dépôt',
  history: 'historique',
} as const satisfies Readonly<Record<CheckScope, string>>;

type CheckDefinition = Readonly<{ scope: CheckScope; summary: string; message: string }>;

export const CHECKS = {
  'adr/encoding-invalid-utf8': {
    scope: 'file',
    summary: 'contenu en UTF-8 valide',
    message: 'octets qui ne forment pas de l’UTF-8 valide : enregistrer le fichier en UTF-8',
  },
  'adr/encoding-bom': {
    scope: 'file',
    summary: 'pas de marque d’ordre des octets',
    message: 'marque d’ordre des octets (BOM) en tête du fichier : l’enlever',
  },
  'adr/encoding-not-nfc': {
    scope: 'file',
    summary: 'texte normalisé en NFC',
    message: 'caractère décomposé : normaliser le texte en NFC',
  },
  'adr/encoding-invisible': {
    scope: 'file',
    summary: 'ni retour chariot ni caractère de contrôle ou invisible',
    message: 'caractère {codePoint} de contrôle ou invisible : le retirer',
  },

  'adr/frontmatter-missing': {
    scope: 'file',
    summary: 'en-tête YAML en tête du fichier',
    message: 'aucun en-tête YAML : le fichier commence par ---',
  },
  'adr/frontmatter-yaml': {
    scope: 'file',
    summary: 'en-tête en YAML 1.2 sans erreur, avertissement ni alias',
    message: 'YAML refusé : {problem}',
  },
  'adr/frontmatter-format-unknown': {
    scope: 'file',
    summary: 'version de format connue',
    message: 'format {found} : versions connues {known}',
  },
  'adr/frontmatter-format-outdated': {
    scope: 'file',
    summary: 'un ADR proposé suit le dernier format',
    message: 'ADR proposé au format {found} : passer au format {latest}',
  },
  'adr/frontmatter-schema': {
    scope: 'file',
    summary: 'en-tête conforme au schéma de son format',
    message: '{field} : {problem}',
  },
  'adr/frontmatter-not-canonical': {
    scope: 'file',
    summary: 'en-tête écrit sous sa forme canonique unique',
    message: 'en-tête non canonique : écrire exactement {expected}',
  },

  'adr/markdown-node': {
    scope: 'file',
    summary: 'seuls les éléments Markdown du format',
    message: 'élément Markdown {node} : absent du format',
  },
  'adr/markdown-heading-depth': {
    scope: 'file',
    summary: 'titres limités à la profondeur du format',
    message: 'titre de niveau {depth} : {max} niveaux au plus',
  },
  'adr/markdown-task-list': {
    scope: 'file',
    summary: 'pas de case à cocher',
    message: 'case à cocher dans une liste : l’enlever',
  },
  'adr/markdown-link-title': {
    scope: 'file',
    summary: 'pas de titre de lien',
    message: 'lien avec un titre entre guillemets : garder la seule adresse',
  },
  'adr/markdown-indented-code': {
    scope: 'file',
    summary: 'blocs de code clôturés',
    message: 'bloc de code indenté : le clôturer par {fence}',
  },
  'adr/markdown-code-language': {
    scope: 'file',
    summary: 'blocs de code avec leur langage',
    message: 'bloc de code sans langage : écrire le langage après la clôture',
  },

  'adr/title-missing': {
    scope: 'file',
    summary: 'un titre de niveau 1',
    message: 'aucun titre de niveau 1 : écrire « # titre » après l’en-tête',
  },
  'adr/title-not-first': {
    scope: 'file',
    summary: 'le titre suit directement l’en-tête',
    message: 'contenu avant le titre : le titre de niveau 1 suit directement l’en-tête',
  },
  'adr/title-duplicate': {
    scope: 'file',
    summary: 'un seul titre de niveau 1',
    message: 'second titre de niveau 1 : un seul titre par ADR',
  },
  'adr/title-rich': {
    scope: 'file',
    summary: 'titre en texte simple ou en code',
    message: 'titre avec emphase ou lien : texte simple ou code seulement',
  },
  'adr/title-no-letter': {
    scope: 'file',
    summary: 'titre avec au moins une lettre ou un chiffre',
    message: 'titre sans lettre ni chiffre : énoncer la décision',
  },
  'adr/title-too-long': {
    scope: 'file',
    summary: 'titre court',
    message: 'titre de {length} caractères : {max} au plus',
  },
  'adr/title-forbidden-character': {
    scope: 'file',
    summary: 'titre sans caractère refusé : un groupe nominal',
    message: 'titre avec « {character} » : un groupe nominal qui énonce la décision',
  },
  'adr/title-final-punctuation': {
    scope: 'file',
    summary: 'titre sans ponctuation finale',
    message: 'titre terminé par « {character} » : l’enlever',
  },
  'adr/slug-mismatch': {
    scope: 'file',
    summary: 'nom de fichier dérivé du titre',
    message: 'nom de fichier qui ne suit pas le titre : {expected}',
  },

  'adr/section-content-before': {
    scope: 'file',
    summary: 'rien entre le titre et la première section',
    message: 'contenu entre le titre et la première section : le déplacer dans une section',
  },
  'adr/section-order': {
    scope: 'file',
    summary: 'sections du format, toutes présentes, dans l’ordre',
    message: 'sections {found} : attendues dans l’ordre {expected}',
  },
  'adr/section-subsection': {
    scope: 'file',
    summary: 'sous-sections seulement dans les sections qui en prévoient',
    message: 'sous-section « {subsection} » dans « {section} » : cette section n’en a pas',
  },
  'adr/section-consequences': {
    scope: 'file',
    summary: 'la décision a pour seule sous-section ses conséquences',
    message: 'sous-sections de la décision {found} : une seule, « {expected} »',
  },
  'adr/section-pros-and-cons-text': {
    scope: 'file',
    summary: 'arguments rangés sous leur option',
    message: 'contenu hors des sous-sections d’options : le placer sous l’option concernée',
  },

  'adr/context-question-missing': {
    scope: 'file',
    summary: 'le contexte se termine par la question du problème',
    message: 'contexte qui ne se termine pas par un paragraphe : finir par la question du problème',
  },
  'adr/context-question-shape': {
    scope: 'file',
    summary: 'une seule question, terminée par un point d’interrogation',
    message: 'paragraphe final qui n’est pas une question unique : une seule phrase terminée par « {questionMark} »',
  },
  'adr/context-facts-missing': {
    scope: 'file',
    summary: 'au moins une liste de faits',
    message: 'aucune liste de faits : lister les faits sourcés avant la question',
  },
  'adr/context-fact-shape': {
    scope: 'file',
    summary: 'un fait par puce, en un paragraphe',
    message: 'puce de fait sur plusieurs blocs : un seul paragraphe par fait',
  },
  'adr/context-fact-unsourced': {
    scope: 'file',
    summary: 'chaque fait cite sa source',
    message: 'fait sans source : ajouter un lien, une commande en code ou ADR-NNNN',
  },
  'adr/context-stray-block': {
    scope: 'file',
    summary: 'faits en listes, question en paragraphe final',
    message: 'bloc avant la question qui n’est pas une liste : écrire les faits en liste à puces',
  },

  'adr/criteria-list': {
    scope: 'file',
    summary: 'critères en une seule liste à puces',
    message: 'critères hors d’une liste à puces unique : une seule liste',
  },
  'adr/criteria-label': {
    scope: 'file',
    summary: 'critères numérotés à partir de 1, sans trou',
    message: 'puce de critère mal libellée : {line}',
  },

  'adr/options-list': {
    scope: 'file',
    summary: 'options en une seule liste à puces',
    message: 'options hors d’une liste à puces unique : une seule liste',
  },
  'adr/options-name': {
    scope: 'file',
    summary: 'une option est un nom seul',
    message: 'option qui n’est pas un nom seul : un paragraphe, sans les guillemets de l’option retenue',
  },
  'adr/options-duplicate': {
    scope: 'file',
    summary: 'options toutes différentes',
    message: 'option « {name} » en double : la nommer une seule fois',
  },
  'adr/options-too-few': {
    scope: 'file',
    summary: 'assez d’options étudiées',
    message: 'options étudiées au nombre de {count} : au moins {min}',
  },
  'adr/options-subsections': {
    scope: 'file',
    summary: 'une sous-section d’arguments par option, dans l’ordre des options',
    message: 'sous-sections d’arguments {found} : attendues dans l’ordre {expected}',
  },

  'adr/decision-chosen-shape': {
    scope: 'file',
    summary: 'la décision commence par l’option retenue et sa justification',
    message: 'première phrase de la décision mal formée : {template}',
  },
  'adr/decision-chosen-unknown': {
    scope: 'file',
    summary: 'option retenue parmi les options étudiées',
    message: 'option retenue « {name} » absente des options étudiées : reprendre un nom de la liste',
  },
  'adr/decision-chosen-duplicate': {
    scope: 'file',
    summary: 'une seule option retenue',
    message: 'seconde phrase « {label} » : une seule par ADR, en tête de la décision',
  },
  'adr/decision-rules-missing': {
    scope: 'file',
    summary: 'liste des règles après l’option retenue',
    message: 'aucune liste de règles après l’option retenue : lister {line}',
  },
  'adr/decision-rule-label': {
    scope: 'file',
    summary: 'règles numérotées à partir de 1, sans trou',
    message: 'puce de règle mal libellée : {line}',
  },
  'adr/decision-trailing-block': {
    scope: 'file',
    summary: 'après les règles, seulement du code ou des tableaux',
    message: 'bloc après les règles : seulement des blocs de code ou des tableaux',
  },
  'adr/decision-no-binding-rule': {
    scope: 'file',
    summary: 'au moins une règle contraignante',
    message: 'aucune règle contraignante : au moins une règle {binding}',
  },

  'adr/keyword-forbidden': {
    scope: 'file',
    summary: 'aucun autre mot modal en capitales',
    message: 'mot « {word} » en capitales : une règle emploie {keywords}',
  },
  'adr/keyword-negation': {
    scope: 'file',
    summary: 'négation seulement sous la forme exacte du format',
    message: 'négation « {text} » : écrire {expected}',
  },
  'adr/keyword-count': {
    scope: 'file',
    summary: 'exactement un mot-clé par règle',
    message: 'règle avec {count} mot-clé(s) : exactement un parmi {keywords}',
  },
  'adr/keyword-outside-rule': {
    scope: 'file',
    summary: 'mots-clés en capitales seulement dans les règles',
    message: '« {word} » en capitales hors d’une règle : l’écrire en minuscules ou en code',
  },

  'adr/argument-list': {
    scope: 'file',
    summary: 'arguments et conséquences en une seule liste à puces',
    message: 'arguments de « {section} » hors d’une liste à puces unique : une seule liste',
  },
  'adr/argument-shape': {
    scope: 'file',
    summary: 'chaque argument commence par sa valence et sa justification',
    message: 'puce d’argument mal formée : {template}',
  },
  'adr/consequences-balance': {
    scope: 'file',
    summary: 'conséquences avec au moins un effet positif et un coût',
    message: 'conséquences sans « {good} » ou sans « {bad} » : nommer l’effet et le coût',
  },
  'adr/option-chosen-without-good': {
    scope: 'file',
    summary: 'l’option retenue a au moins un argument positif',
    message: 'option retenue « {name} » sans « {good} » : dire ce qu’elle apporte',
  },
  'adr/option-rejected-without-bad': {
    scope: 'file',
    summary: 'chaque option écartée a au moins un argument négatif',
    message: 'option écartée « {name} » sans « {bad} » : dire pourquoi elle est écartée',
  },

  'adr/citation-malformed': {
    scope: 'file',
    summary: 'citations de critères bien écrites',
    message: 'citation « {text} » : écrire {example}',
  },
  'adr/citation-unknown': {
    scope: 'file',
    summary: 'chaque critère cité existe',
    message: 'critère {label} cité mais inexistant : de {first} à {last}',
  },
  'adr/citation-chosen-missing': {
    scope: 'file',
    summary: 'l’option retenue cite un critère',
    message: 'justification de l’option retenue sans critère cité : citer {example}',
  },
  'adr/citation-argument-missing': {
    scope: 'file',
    summary: 'chaque argument cite un critère',
    message: 'argument sans critère cité : citer {example}',
  },
  'adr/citation-criterion-unused': {
    scope: 'file',
    summary: 'chaque critère est cité par un argument',
    message: 'critère {label} jamais cité dans les arguments : le citer ou le retirer',
  },

  'adr/reevaluation-list': {
    scope: 'file',
    summary: 'informations complémentaires en une seule liste à puces',
    message: 'informations complémentaires hors d’une liste à puces unique : une seule liste',
  },
  'adr/reevaluation-count': {
    scope: 'file',
    summary: 'exactement un déclencheur de réévaluation',
    message: 'puces « {label} » au nombre de {count} : exactement une, avec un fait observable',
  },

  'adr/words-limit': {
    scope: 'file',
    summary: 'nombre de mots limité, hors blocs de code',
    message: '{count} mots hors blocs de code : {max} au plus',
  },

  'adr/link-scheme': {
    scope: 'file',
    summary: 'liens externes avec un protocole du format',
    message: 'lien {url} : adresse absolue attendue, protocole {schemes}',
  },
  'adr/link-malformed': {
    scope: 'file',
    summary: 'liens relatifs bien encodés',
    message: 'lien {url} mal encodé : corriger ses séquences %',
  },
  'adr/link-empty': {
    scope: 'file',
    summary: 'chaque lien a une adresse',
    message: 'lien « {text} » sans adresse : écrire son adresse ou retirer le lien',
  },
  'adr/mention-malformed': {
    scope: 'file',
    summary: 'mentions écrites ADR-NNNN',
    message: 'mention « {text} » : écrire ADR suivi de {digits} chiffres',
  },

  'adr/path-directory': {
    scope: 'collection',
    summary: 'aucun dossier parmi les ADR',
    message: 'dossier parmi les ADR : seulement des fichiers NNNN-slug.md et l’index',
  },
  'adr/path-name': {
    scope: 'collection',
    summary: 'fichiers nommés NNNN-slug.md',
    message: 'nom de fichier hors format : NNNN-slug.md, slug en minuscules, chiffres et tirets',
  },
  'adr/number-duplicate': {
    scope: 'collection',
    summary: 'un numéro par ADR',
    message: '{id} porté par plusieurs fichiers : {paths}',
  },
  'adr/link-target-missing': {
    scope: 'collection',
    summary: 'liens relatifs vers des fichiers du dépôt',
    message: 'lien {url} : aucun fichier du dépôt à cette adresse',
  },
  'adr/mention-unknown': {
    scope: 'collection',
    summary: 'chaque ADR mentionné existe',
    message: '{id} mentionné mais inexistant',
  },
  'adr/supersedes-unknown': {
    scope: 'collection',
    summary: 'chaque ADR remplacé existe',
    message: 'remplace {id}, qui n’existe pas',
  },
  'adr/supersedes-newer': {
    scope: 'collection',
    summary: 'seul un ADR plus ancien est remplacé',
    message: 'remplace {id}, qui n’est pas plus ancien',
  },
  'adr/supersedes-not-accepted': {
    scope: 'collection',
    summary: 'seul un ADR accepté est remplacé',
    message: 'remplace {id}, {status} : seul un ADR accepté se remplace',
  },
  'adr/supersedes-several': {
    scope: 'collection',
    summary: 'un ADR remplacé par un seul ADR accepté',
    message: 'remplacé par plusieurs ADR acceptés : {successors}',
  },

  'adr/binding-malformed-id': {
    scope: 'repository',
    summary: 'liens rangés par identifiant ADR-NNNN',
    message: 'clé « {key} » : identifiant ADR-NNNN attendu',
  },
  'adr/binding-unknown-adr': {
    scope: 'repository',
    summary: 'liens seulement pour des ADR existants',
    message: '{id} n’existe pas : retirer ses liens',
  },
  'adr/binding-inactive': {
    scope: 'repository',
    summary: 'pas de liens pour un ADR rejeté ou remplacé',
    message: '{id} {status} : ses règles ne s’appliquent plus, retirer ses liens',
  },
  'adr/binding-missing': {
    scope: 'repository',
    summary: 'chaque ADR accepté a ses liens',
    message: '{id} accepté sans liens : lier ses règles contraignantes',
  },
  'adr/binding-rule-unbound': {
    scope: 'repository',
    summary: 'chaque règle contraignante est liée',
    message: '{id} {rule} contraignante sans preuve ni convention',
  },
  'adr/binding-rule-extra': {
    scope: 'repository',
    summary: 'liens seulement pour les règles contraignantes',
    message: '{id} {rule} : pas une règle contraignante de l’ADR',
  },
  'adr/binding-convention-empty': {
    scope: 'repository',
    summary: 'chaque convention est justifiée',
    message: '{id} {rule} : convention sans justification',
  },
  'adr/binding-proof-unknown': {
    scope: 'repository',
    summary: 'chaque preuve désigne une fixture existante',
    message: '{id} {rule} : preuve {proof} inconnue',
  },
  'adr/binding-no-proven-rule': {
    scope: 'repository',
    summary: 'un ADR accepté a au moins une règle prouvée',
    message: '{id} accepté sans règle prouvée par une fixture : en prouver au moins une',
  },
  'adr/scope-glob-invalid': {
    scope: 'repository',
    summary: 'motifs de périmètre relatifs à la racine',
    message: '{id} : motif « {glob} » invalide, relatif à la racine, sans ./, .., / final ni espace',
  },
  'adr/scope-glob-duplicate': {
    scope: 'repository',
    summary: 'motifs de périmètre tous différents',
    message: '{id} : motif « {glob} » en double',
  },
  'adr/scope-glob-empty': {
    scope: 'repository',
    summary: 'chaque motif de périmètre couvre un fichier',
    message: '{id} : motif « {glob} » ne couvre aucun fichier du dépôt',
  },

  'adr/history-not-repository': {
    scope: 'history',
    summary: 'vérification dans un dépôt git',
    message: 'pas un dépôt git : transitions et immuabilité invérifiables',
  },
  'adr/history-shallow': {
    scope: 'history',
    summary: 'historique git complet',
    message: 'historique superficiel : lancer git fetch --unshallow',
  },
  'adr/transition-first-not-proposed': {
    scope: 'history',
    summary: 'un ADR est d’abord commité proposé',
    message: '{id} commité d’emblée en {status} : {initial} d’abord',
  },
  'adr/transition-forbidden': {
    scope: 'history',
    summary: 'seules les transitions du processus',
    message: '{id} passé de {from} à {to} : transitions permises depuis {from} : {allowed}',
  },
  'adr/transition-uncommitted': {
    scope: 'history',
    summary: 'la version proposée est commitée avant la décision',
    message: '{id} décidé sans version proposée commitée : commiter la proposition d’abord',
  },
  'adr/frozen-modified': {
    scope: 'history',
    summary: 'un ADR décidé ne change plus',
    message: '{id} modifié après sa décision : proposer un nouvel ADR qui le remplace',
  },
  'adr/frozen-renamed': {
    scope: 'history',
    summary: 'un ADR décidé garde son nom',
    message: '{id} renommé après sa décision, depuis {from}',
  },
  'adr/deleted': {
    scope: 'history',
    summary: 'un ADR commité n’est jamais supprimé',
    message: '{id} commité puis supprimé : le garder, rejeté si besoin',
  },
  'adr/accept-proof-failing': {
    scope: 'history',
    summary: 'une acceptation a des preuves qui passent',
    message: '{id} accepté dans l’index mais sa preuve {proof} échoue',
  },
  'adr/decision-by-agent': {
    scope: 'history',
    summary: 'aucune décision indexée depuis une session d’agent',
    message: '{id} décidé dans l’index depuis une session d’agent ({markers}) : décision réservée au décideur humain',
  },
  'adr/acknowledgment-unused': {
    scope: 'history',
    summary: 'chaque écart d’historique reconnu correspond à un écart réel',
    message: 'écart reconnu {code} au commit {commit} introuvable : retirer cette reconnaissance',
  },
} as const satisfies Readonly<Record<string, CheckDefinition>>;

const ADR_CHECKS = defineChecks(CHECKS);

export type CheckCode = keyof typeof CHECKS;

export const CHECK_CODES: readonly CheckCode[] = ADR_CHECKS.codes;

export type ScopedCode<Scope extends CheckScope> = {
  [Code in CheckCode]: (typeof CHECKS)[Code]['scope'] extends Scope ? Code : never;
}[CheckCode];

/** Values of the `{name}` placeholders of a code's message; none for a message without placeholder. */
export type CheckDetails<Code extends CheckCode> = CheckDetailsOf<typeof CHECKS, Code>;

export const checkMessage = ADR_CHECKS.message;

/** A diagnostic of `code` with its message rendered. */
export const finding = ADR_CHECKS.finding;
