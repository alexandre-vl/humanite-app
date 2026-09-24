/**
 * What must never come out of a capture and into the repository.
 *
 * A capture of the official app is recorded while someone is signed in. It therefore holds, in clear: the reader's
 * login and password, the session tokens the service answered with, the cookies it set, and the static secret the
 * official client identifies itself with. None of that describes the shape of the service, which is the only reason
 * a capture is read at all — so none of it has any business in a file the repository tracks and a remote hosts.
 *
 * This is a reading and not a cleaner, on purpose. A cleaner that silently rewrote a secret would leave no trace of
 * having been needed, and the day its pattern stopped matching, nothing would say so. A reading names what it found
 * and the command that writes a module refuses to write when it finds anything — so a secret does not get through
 * quietly, it stops the command.
 *
 * Nothing here ever repeats the value it found. A diagnostic that quoted a token would put the token in a terminal,
 * a log and a scrollback, which is most of the way to putting it in the repository.
 */

/**
 * The name of one kind of thing a capture carries that must not be written down. A union rather than a list, nothing
 * ever walking the codes: a reading names each kind it saw, and a fixture names the set it expects.
 */
export type SecretCode = 'secret/token' | 'secret/password' | 'secret/address' | 'secret/cookie' | 'secret/key';

/** One kind of secret a reading found, how many times, and where the first one sits — never what it says. */
export type SecretFinding = Readonly<{ code: SecretCode; says: string }>;

/** What a kind of secret looks like, and how to say that one was found without saying what it was. */
type Hunt = Readonly<{ code: SecretCode; pattern: RegExp; what: string }>;

/**
 * How many of one kind are counted before the count stops mattering.
 *
 * A reading answers one question — is there any of this in here — and the answer is the same at a thousand as at a
 * hundred. Counting to the end is what makes a reading unusable on the thing it most needs to be usable on: a capture
 * is a hundred and forty megabytes, and the bundles inside it hold enough address-shaped text to keep a scan busy for
 * minutes. Found out by running it on one, not by reading it.
 */
const MANY = 100;

/**
 * A field named one of `names` whose value is a text, however the two are quoted.
 *
 * A capture's own JSON writes `"password": "…"`, and the module a reading writes is formatted, which writes
 * `password: '…'` and `'customer-hash': '…'`. The formatted module is the only text the reading is ever handed, so a
 * pattern that knew the first form alone found nothing where it was needed — measured on the fixtures, which were
 * then written in the first form and passed.
 */
const field = (names: string): string => String.raw`["']?\b(?:${names})\b["']?\s*:\s*(?:"[^"]+"|'[^']+')`;

/**
 * The shapes a secret takes in this journal's own capture, each measured on one.
 *
 * `token` is a JSON Web Token: three parts joined by dots, the first of which is a base64 of `{"` and so always
 * begins `eyJ`. `key` covers both the static secret the official client sends to be recognised and the hash the
 * service hands back to identify a customer — four groups of four hex signs for the first, sixty-four for the second.
 */
const HUNTS: readonly Hunt[] = [
  {
    code: 'secret/token',
    pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/gu,
    what: 'un jeton',
  },
  {
    code: 'secret/password',
    pattern: new RegExp(field('password|passwd|pwd|mot_de_passe'), 'giu'),
    what: 'un mot de passe',
  },
  // Every quantifier here is bounded, and the first is anchored on a word boundary. Unbounded, `[\w.%+-]+` walks the
  // whole of a base64 blob before failing on the `@` and starting again one sign further: a capture holds megabytes
  // of those, and the scan went from instant to minutes. Measured on one, not reasoned about.
  {
    code: 'secret/address',
    pattern: /\b[\w.%+-]{1,64}@[\w-]{1,63}\.[a-z]{2,24}\b/giu,
    what: 'une adresse de courrier',
  },
  {
    code: 'secret/cookie',
    pattern: new RegExp(
      String.raw`${field('cookie|set-cookie')}|\b(?:PHPSESSID|JSESSIONID|sessionid)=[^;"'\s]+`,
      'giu',
    ),
    what: 'un témoin de connexion',
  },
  {
    code: 'secret/key',
    pattern: new RegExp(
      String.raw`${field('app_secret|api[_-]?key|client_secret|customer-hash|customer-data')}|\b[0-9a-f]{64}\b|\b[0-9a-f]{4}(?:-[0-9a-f]{4}){3}\b`,
      'giu',
    ),
    what: 'une clé',
  },
];

/**
 * Every kind of secret a text carries, each named once with a count and the place the first one sits.
 *
 * The text is handed in rather than read from a file, which is what lets a fixture hand it one secret at a time and
 * read the code that comes back — and what lets the command hand it the module it is about to write, before writing.
 */
export const judgeSecrets = (text: string): readonly SecretFinding[] =>
  HUNTS.flatMap((hunt): readonly SecretFinding[] => {
    const pattern = new RegExp(hunt.pattern.source, hunt.pattern.flags);
    let count = 0;
    let first = -1;
    let found = pattern.exec(text);
    while (found !== null && count < MANY) {
      if (first < 0) {
        first = found.index;
      }
      count += 1;
      found = pattern.exec(text);
    }
    if (count === 0) {
      return [];
    }
    const times = count === MANY ? `${String(MANY)} fois au moins` : `${String(count)} fois`;
    return [{ code: hunt.code, says: `${hunt.what} (${times}, le premier au signe ${String(first)})` }];
  });
