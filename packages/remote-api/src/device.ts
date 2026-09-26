import { aes128CbcEncrypt } from './aes.ts';

/**
 * The device a caller attests when it opens a connection, minted the way the official client mints it.
 *
 * The service hands an anonymous token only to a caller that presents a device under `crypt_mode` `jdly`: an
 * AES-128-CBC ciphertext, hex-encoded, of a small JSON naming the device. The official client generates a random
 * identifier once per install (a UUID), keeps it, and encrypts it under a key it carries — the two constants below,
 * read straight out of the client. Nothing here is a device's own hardware: the service reads the ciphertext, not the
 * phone, so a self-minted token for a fresh identifier is exactly what a fresh install of the official client sends.
 *
 * Measured against the live service on 2026-09-26: a token minted here for a random identifier clears the wall
 * (`POST /anonymous-token` → 200), and the whole chain follows — login, then a reserved article with `right: true`.
 * The service does not read the signature (`sgn`): a token carrying a deliberately wrong one is taken all the same,
 * so this sends the field empty rather than forge the official client's signature over the identifier.
 */

/** `text`, one byte a character. The attestation is ASCII through and through — a UUID and a few fixed words — so a
 * character's code is its byte, and this needs no `TextEncoder`, which the app's engine does not carry. */
const asciiBytes = (text: string): Uint8Array => Uint8Array.from(text, (character) => character.charCodeAt(0) & 0xff);

/** The key and vector the official client encrypts its `jdly` device attestation under, read out of `libanDeliveryCore`. */
const JDLY_KEY = asciiBytes('1234567890123456');
const JDLY_IV = asciiBytes('6543210987654321');

/** The one attestation mode the service mints and the only one it reads. */
export const DEVICE_CRYPT_MODE = 'jdly';

/** The version the attestation announces, as the official client writes it. */
const SIGNATURE_VERSION = '4.0';

const toHex = (bytes: Uint8Array): string => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

/** `bytes`, padded with spaces to a whole number of 16-byte blocks — the padding the official client's token carries. */
const spacePadded = (bytes: Uint8Array): Uint8Array => {
  const fill = (16 - (bytes.length % 16)) % 16;
  if (fill === 0) {
    return bytes;
  }
  const padded = new Uint8Array(bytes.length + fill);
  padded.set(bytes);
  padded.fill(0x20, bytes.length);
  return padded;
};

/**
 * The `crypt_value` for a device identified by `deviceId`: the attestation JSON, encrypted and hex-encoded.
 *
 * `deviceId` is the identifier this install keeps for itself; the caller generates it once and stores it, as the
 * official client does. The same identifier always mints the same token, so the service sees one steady device.
 */
export const mintDeviceToken = (deviceId: string): string => {
  const json = `{\n  "id" : "${deviceId}",\n  "sgn" : "",\n  "sgn_ver" : "${SIGNATURE_VERSION}"\n}`;
  const encrypted = aes128CbcEncrypt(JDLY_KEY, JDLY_IV, spacePadded(asciiBytes(json)));
  return toHex(encrypted);
};
