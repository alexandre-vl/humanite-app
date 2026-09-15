import type { CheckCodeOf } from '@huma/kit/checks';
import { defineChecks } from '@huma/kit/checks';
import type { GuardAction, GuardFailure } from './guard/status.ts';

/** Findings of the emulator commands: what the host, the root guard, docker and a session must be. */
const TABLE = {
  'emulator/binder-module': {
    summary: 'le module binder crée les périphériques de l’émulateur',
    message: '{module} : {state}, attendu chargé avec devices={devices}',
  },
  'emulator/binder-device': {
    summary: 'chaque périphérique binder est un périphérique caractère ouvert à tous',
    message: '{device} : {state}, attendu un périphérique caractère en 666',
  },
  'emulator/host-residue': {
    summary: 'l’hôte ne garde aucune écriture d’Android d’une session précédente',
    message: '{kind} {key} : {value}, écrit par Android ; attendu {expected}',
  },
  'emulator/guard-install': {
    summary: 'les fichiers installés du garde root sont ceux du commit courant',
    message: '{file} : {state}',
  },
  'emulator/guard-path': {
    summary: 'seul root peut modifier le chemin des fichiers du garde root',
    message: '{path} : {state}',
  },
  'emulator/guard-uncommitted': {
    summary: 'les fichiers du garde root sont commités avant d’être installés',
    message: 'modifié depuis le dernier commit : commiter avant d’installer',
  },
  'emulator/guard-timer': {
    summary: 'le minuteur du garde root est actif',
    message: '{unit} : {state}',
  },
  'emulator/guard-status': {
    summary: 'le garde root publie un statut lisible, de ce démarrage de l’hôte',
    message: '{text}',
  },
  'emulator/guard-phase': {
    summary: 'le garde root est dans une phase qui permet l’étape',
    message: 'phase {phase} ({mode}), attendu {expected}',
  },
  'emulator/guard-stale': {
    summary: 'le dernier passage du garde root est récent',
    message: 'dernier passage il y a {seconds} s, attendu moins de {limit} s',
  },
  'emulator/guard-scripts': {
    summary: 'le garde root tourne avec les fichiers installés lors de son armement',
    message: '{file} : {state}',
  },
  'emulator/image': {
    summary: 'l’image Redroid est celle que la configuration épingle',
    message: '{reference} : {state}',
  },
  'emulator/container-config': {
    summary: 'un conteneur existant a les options de la configuration',
    message: '{container} : {state}',
  },
  'emulator/host-drift': {
    summary: 'l’hôte est identique avant et après une session de l’émulateur',
    message: '{kind} {key} : {before} → {after}',
  },
  'emulator/step': {
    summary: 'chaque étape vérifie sa postcondition avant la suivante',
    message: '{step} : {evidence}',
  },
} as const;

export const EMULATOR_CHECKS = defineChecks(TABLE);

export type EmulatorCode = CheckCodeOf<typeof TABLE>;

export const emulatorFinding = EMULATOR_CHECKS.finding;

/**
 * What the root guard reports in its status: how each run treated a difference between the reference and the host,
 * and why a run failed. The codes are the words `root/lib.sh` writes, under `root/`.
 */
const GUARD_TABLE = {
  'root/revert': {
    summary: 'une écriture qu’Android fait sur l’hôte est annulée',
    message: '{kind} {key} : {is} remis à {was}',
  },
  'root/revert-unknown': {
    summary: 'un écart qu’Android n’explique pas pendant une session est annulé, et le passage échoue',
    message: '{kind} {key} : {is} remis à {was}, écart non attribué à Android',
  },
  'root/pending': {
    summary: 'une instance tracefs d’Android est retirée une fois le conteneur arrêté',
    message: '{kind} {key} : retirée à l’arrêt du conteneur',
  },
  'root/keep-unknown': {
    summary:
      'une instance tracefs créée pendant une session et qu’Android n’explique pas est gardée, et le passage échoue',
    message: '{kind} {key} : gardée, instance non attribuée à Android',
  },
  'root/unrevertable': {
    summary: 'une valeur que le garde ne sait pas réécrire fait échouer le passage',
    message: '{kind} {key} : {was} → {is}, impossible à réécrire',
  },
  'root/accept': {
    summary: 'hors session, la référence suit un écart qu’Android n’explique pas',
    message: '{kind} {key} : {was} → {is}, repris dans la référence',
  },
  'root/capture-failed': {
    summary: 'chaque instantané de l’hôte est complet',
    message: 'instantané incomplet : {detail}',
  },
  'root/residue': {
    summary: 'l’armement refuse un hôte qui garde des écritures d’Android',
    message: 'écritures d’Android restées sur l’hôte :{detail}',
  },
  'root/unattributed': {
    summary: 'aucun écart pendant une session n’est inexpliqué',
    message: 'écarts non attribués à Android :{detail}',
  },
  'root/unwritable-value': {
    summary: 'aucun écart ne porte sur une valeur impossible à réécrire',
    message: 'valeurs impossibles à réécrire :{detail}',
  },
  'root/write-failed': {
    summary: 'chaque réécriture du garde réussit',
    message: 'réécritures en échec :{detail}',
  },
  'root/not-restored': {
    summary: 'le second instantané ne trouve plus aucun écart à annuler',
    message: 'écarts encore présents après réécriture :{detail}',
  },
  'root/scripts-changed': {
    summary: 'les fichiers installés ne changent pas tant que le garde est armé',
    message: '{detail}',
  },
} as const satisfies Readonly<
  Record<`root/${GuardAction | GuardFailure}`, Readonly<{ summary: string; message: string }>>
>;

const GUARD_CHECKS = defineChecks(GUARD_TABLE);

export type GuardCode = CheckCodeOf<typeof GUARD_TABLE>;

export const guardFinding = GUARD_CHECKS.finding;
