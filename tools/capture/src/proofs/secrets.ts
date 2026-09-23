import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixtureFactory } from '@huma/fixtures';
import { findWorkspaceRoot } from '@huma/kit/cli';
import { RECORDED_PATH } from '../answers.ts';
import { judgeSecrets } from '../secrets.ts';
import type { SecretCode } from '../secrets.ts';

const define = fixtureFactory<SecretCode>();

/**
 * Texts carrying one secret each, read by the reading that guards what a capture may write down.
 *
 * Here the reading is real and it is the text that is made up — except for the first fixture, where the text is the
 * module a capture actually wrote and that git actually tracks. That one is not a demonstration, it is the standing
 * guarantee: the day a capture puts a token, a password, an address, a cookie or a key into that file, this fixture
 * turns red before anything is pushed anywhere.
 *
 * The made-up ones are what show the reading would have spoken. Every value below is invented, and each is shaped
 * the way the journal's own capture shapes that kind of secret.
 */
const judged = (text: string) => async (): Promise<readonly SecretCode[]> =>
  Promise.resolve(judgeSecrets(text).map((finding) => finding.code));

/** A JWT of the right shape and of no value: three parts, the first a base64 of an object. */
const TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJpbnZlbnRlIiwiaWF0IjowfQ.c2lnbmF0dXJlLWludmVudGVl';

export const SECRET_FIXTURES = [
  define(
    'secret/recorded-clean',
    'les réponses que le dépôt garde, telles qu’elles sont suivies',
    [],
    async (): Promise<readonly SecretCode[]> => {
      const root = await findWorkspaceRoot(import.meta.dirname);
      const text = await readFile(join(root, RECORDED_PATH), 'utf8');
      return judgeSecrets(text).map((finding) => finding.code);
    },
  ),
  define(
    'secret/token',
    'un jeton de session laissé dans un corps',
    ['secret/token'],
    judged(`{"x_user_token":"${TOKEN}"}`),
  ),
  define(
    'secret/password',
    'le mot de passe d’une connexion laissé dans un corps',
    ['secret/password'],
    judged('{"login":"quelquun","password":"un-mot-de-passe"}'),
  ),
  define(
    'secret/address',
    'l’adresse de courrier qui nomme le lecteur',
    ['secret/address'],
    judged('{"contact":"quelquun@exemple.fr"}'),
  ),
  define(
    'secret/cookie',
    'un témoin de connexion porté par un en-tête',
    ['secret/cookie'],
    judged('{"set-cookie":"PHPSESSID=abcdef0123456789; path=/"}'),
  ),
  define(
    'secret/key',
    'la clé statique dont le client officiel se sert pour être reconnu',
    ['secret/key'],
    judged('{"app_id":300,"app_secret":"0a1b-2c3d-4e5f-6a7b"}'),
  ),
] as const;
