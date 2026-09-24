import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixtureFactory } from '@huma/fixtures';
import { findWorkspaceRoot } from '@huma/kit/cli';
import { formatForPath } from '@huma/kit/format';
import { repoPath } from '@huma/kit/paths';
import type { UnknownRecord } from '@huma/unknown';
import { moduleOf, RECORDED_PATH } from '../answers.ts';
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
 * the way the journal's own capture shapes that kind of secret. Each is judged in the one form the reading is ever
 * handed: kept in an answer, laid out in the module a reading writes, and formatted the way that module is written.
 * The capture's own JSON quotes a field `"password": "…"` and the formatted module writes `password: '…'`, so a
 * reading proven on the first could be blind to the second, and was.
 */
const written = (answer: UnknownRecord) => async (): Promise<readonly SecretCode[]> => {
  const root = await findWorkspaceRoot(import.meta.dirname);
  const kept = { path: '/wordpress/home', query: '?&language=fr&ano=1', answer };
  const text = await formatForPath(
    root,
    repoPath(RECORDED_PATH),
    moduleOf({ answers: { front: kept }, articles: {}, missing: [] }),
  );
  return judgeSecrets(text).map((finding) => finding.code);
};

/** A JWT of the right shape and of no value: three parts, the first a base64 of an object. */
const TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJqdGkiOiJpbnZlbnRlIiwiaWF0IjowfQ.c2lnbmF0dXJlLWludmVudGVl';

/** A customer's hash of the right shape and of no value: sixty-four hex signs. */
const HASH = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

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
    written({ x_user_token: TOKEN }),
  ),
  define(
    'secret/password',
    'le mot de passe d’une connexion laissé dans un corps',
    ['secret/password'],
    written({ login: 'quelquun', password: 'un-mot-de-passe' }),
  ),
  define(
    'secret/address',
    'l’adresse de courrier qui nomme le lecteur',
    ['secret/address'],
    written({ contact: 'quelquun@exemple.fr' }),
  ),
  define(
    'secret/cookie',
    'un témoin de connexion porté par un en-tête',
    ['secret/cookie'],
    written({ 'set-cookie': 'jeton=abcdef0123456789; path=/' }),
  ),
  define(
    'secret/cookie-session',
    'l’identifiant de session d’un serveur, dans un champ qui ne le nomme pas',
    ['secret/cookie'],
    written({ header: 'PHPSESSID=abcdef0123456789' }),
  ),
  define(
    'secret/key',
    'la clé statique dont le client officiel se sert pour être reconnu',
    ['secret/key'],
    written({ app_id: 300, app_secret: 'une-cle-inventee' }),
  ),
  define(
    'secret/key-official',
    'la clé du client officiel à sa forme, dans un champ qui ne la nomme pas',
    ['secret/key'],
    written({ reference: '0a1b-2c3d-4e5f-6a7b' }),
  ),
  define(
    'secret/key-hash',
    'l’empreinte d’un client que le service rend, dans un champ qui ne la nomme pas',
    ['secret/key'],
    written({ fingerprint: HASH }),
  ),
] as const;
