/**
 * AES-128 in CBC, encryption only, in plain TypeScript.
 *
 * The service opens a subscriber's connection to a caller that attests a device the way the official client does: an
 * AES-128-CBC ciphertext of a small JSON, under a key the client carries (see `device.ts`). React Native's engine
 * ships no AES, and this one exchange is all the app encrypts, so the algorithm lives here rather than behind a native
 * module — a hundred lines the whole repository can read, proven against the FIPS-197 and SP 800-38A test vectors in
 * `aes.test.ts`.
 *
 * Encryption only, and no mode but CBC: what the app needs is to mint one token. Decryption, other key lengths and
 * other modes are left out rather than written and never called.
 */

const BLOCK = 16;

/** The byte at `index`, which every caller here has kept in range: the guard names a bug rather than reading past. */
const byteAt = (bytes: Uint8Array, index: number): number => {
  const value = bytes[index];
  if (value === undefined) {
    throw new RangeError('AES : lecture hors bornes');
  }
  return value;
};

/** Doubling in GF(2^8), the field AES is built on: a left shift, folded back by the AES polynomial when it overflows. */
const xtime = (byte: number): number => ((byte << 1) ^ ((byte & 0x80) !== 0 ? 0x11b : 0)) & 0xff;

/** Multiplication in GF(2^8): add up the doublings of `a` the bits of `b` select. */
const mul = (a: number, b: number): number => {
  let product = 0;
  let left = a;
  let right = b;
  while (right > 0) {
    if ((right & 1) === 1) {
      product ^= left;
    }
    left = xtime(left);
    right >>= 1;
  }
  return product & 0xff;
};

/**
 * The S-box, computed once rather than written as a table of magic numbers.
 *
 * Each byte's substitute is its inverse in GF(2^8) put through AES's affine map; the inverses come from a log table
 * over the field's generator 3. Reading the construction is what tells you the table is the real one.
 */
const buildSbox = (): Uint8Array => {
  const log = new Uint8Array(256);
  const exp = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    exp[i] = x;
    log[x] = i;
    x ^= xtime(x); // multiply by the generator 3 = 2 xor 1
  }
  const rotl = (byte: number, by: number): number => ((byte << by) | (byte >> (8 - by))) & 0xff;
  const sbox = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    // The nonzero elements form a cycle of length 255, so the exponent wraps mod 255: for i = 1, log is 0 and the
    // inverse is exp[0] = 1, not exp[255], which the 0..254 table never filled.
    const inverse = i === 0 ? 0 : byteAt(exp, (255 - byteAt(log, i)) % 255);
    sbox[i] = (inverse ^ rotl(inverse, 1) ^ rotl(inverse, 2) ^ rotl(inverse, 3) ^ rotl(inverse, 4) ^ 0x63) & 0xff;
  }
  return sbox;
};

const SBOX = buildSbox();

/** The eleven 16-byte round keys AES-128 draws from a 16-byte key. */
const expandKey = (key: Uint8Array): Uint8Array => {
  const words = 4 * (10 + 1);
  const schedule = new Uint8Array(BLOCK * (10 + 1));
  schedule.set(key.subarray(0, BLOCK));
  const temp = new Uint8Array(4);
  let rcon = 1;
  for (let word = 4; word < words; word++) {
    const back = (word - 1) * 4;
    for (let b = 0; b < 4; b++) {
      temp[b] = byteAt(schedule, back + b);
    }
    if (word % 4 === 0) {
      const rotated = Uint8Array.from([byteAt(temp, 1), byteAt(temp, 2), byteAt(temp, 3), byteAt(temp, 0)]);
      for (let b = 0; b < 4; b++) {
        temp[b] = byteAt(SBOX, byteAt(rotated, b));
      }
      temp[0] = byteAt(temp, 0) ^ rcon;
      rcon = xtime(rcon);
    }
    const start = (word - 4) * 4;
    for (let b = 0; b < 4; b++) {
      schedule[word * 4 + b] = byteAt(schedule, start + b) ^ byteAt(temp, b);
    }
  }
  return schedule;
};

/** One 16-byte block through AES-128, in place. */
const encryptBlock = (state: Uint8Array, schedule: Uint8Array): void => {
  const addRoundKey = (round: number): void => {
    for (let i = 0; i < BLOCK; i++) {
      state[i] = byteAt(state, i) ^ byteAt(schedule, round * BLOCK + i);
    }
  };
  const subBytes = (): void => {
    for (let i = 0; i < BLOCK; i++) {
      state[i] = byteAt(SBOX, byteAt(state, i));
    }
  };
  const shiftRows = (): void => {
    const was = state.slice();
    for (let row = 1; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        state[col * 4 + row] = byteAt(was, ((col + row) % 4) * 4 + row);
      }
    }
  };
  const mixColumns = (): void => {
    for (let col = 0; col < 4; col++) {
      const o = col * 4;
      const a = byteAt(state, o);
      const b = byteAt(state, o + 1);
      const c = byteAt(state, o + 2);
      const d = byteAt(state, o + 3);
      state[o] = mul(a, 2) ^ mul(b, 3) ^ c ^ d;
      state[o + 1] = a ^ mul(b, 2) ^ mul(c, 3) ^ d;
      state[o + 2] = a ^ b ^ mul(c, 2) ^ mul(d, 3);
      state[o + 3] = mul(a, 3) ^ b ^ c ^ mul(d, 2);
    }
  };

  addRoundKey(0);
  for (let round = 1; round < 10; round++) {
    subBytes();
    shiftRows();
    mixColumns();
    addRoundKey(round);
  }
  subBytes();
  shiftRows();
  addRoundKey(10);
};

/**
 * `plaintext`, a whole number of 16-byte blocks, encrypted with AES-128 in CBC under `key` and `iv`.
 *
 * The caller pads: this refuses a length that is not a multiple of the block, rather than pad one way where the caller
 * meant another.
 */
export const aes128CbcEncrypt = (key: Uint8Array, iv: Uint8Array, plaintext: Uint8Array): Uint8Array => {
  if (key.length !== BLOCK || iv.length !== BLOCK) {
    throw new RangeError('AES-128-CBC : la clé et le vecteur font 16 octets');
  }
  if (plaintext.length % BLOCK !== 0) {
    throw new RangeError('AES-128-CBC : le clair doit être un multiple de 16 octets');
  }
  const schedule = expandKey(key);
  const out = new Uint8Array(plaintext.length);
  // A fresh Uint8Array, never `iv.slice()`: on a Node Buffer, slice shares memory rather than copying, and the chain
  // must be ours to mutate. The same reason keeps every internal buffer a Uint8Array.
  const chain = new Uint8Array(iv);
  for (let offset = 0; offset < plaintext.length; offset += BLOCK) {
    for (let i = 0; i < BLOCK; i++) {
      chain[i] = byteAt(chain, i) ^ byteAt(plaintext, offset + i);
    }
    encryptBlock(chain, schedule);
    out.set(chain, offset);
  }
  return out;
};
