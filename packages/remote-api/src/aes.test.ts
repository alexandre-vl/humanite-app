import { expect, test } from 'vitest';
import { aes128CbcEncrypt } from './aes.ts';

const bytes = (hex: string): Uint8Array => Uint8Array.from(hex.match(/../gu) ?? [], (pair) => parseInt(pair, 16));
const hex = (raw: Uint8Array): string => Array.from(raw, (byte) => byte.toString(16).padStart(2, '0')).join('');

test('encrypts the FIPS-197 AES-128 test block', () => {
  // FIPS-197, Appendix B: one block, and with a zero IV a single CBC block is that block through the cipher.
  const key = bytes('2b7e151628aed2a6abf7158809cf4f3c');
  const block = bytes('3243f6a8885a308d313198a2e0370734');
  expect(hex(aes128CbcEncrypt(key, new Uint8Array(16), block))).toBe('3925841d02dc09fbdc118597196a0b32');
});

test('encrypts the NIST SP 800-38A CBC-AES128 vector, all four blocks chained', () => {
  // NIST SP 800-38A, F.2.1 (CBC-AES128.Encrypt): the reference multi-block vector, which exercises the chaining.
  const key = bytes('2b7e151628aed2a6abf7158809cf4f3c');
  const iv = bytes('000102030405060708090a0b0c0d0e0f');
  const plaintext = bytes(
    '6bc1bee22e409f96e93d7e117393172a' +
      'ae2d8a571e03ac9c9eb76fac45af8e51' +
      '30c81c46a35ce411e5fbc1191a0a52ef' +
      'f69f2445df4f9b17ad2b417be66c3710',
  );
  expect(hex(aes128CbcEncrypt(key, iv, plaintext))).toBe(
    '7649abac8119b246cee98e9b12e9197d' +
      '5086cb9b507219ee95db113a917678b2' +
      '73bed6b8e3c1743b7116e69e22229516' +
      '3ff1caa1681fac09120eca307586e1a7',
  );
});

test('refuses a key or vector that is not 16 bytes, and a plaintext that is not whole blocks', () => {
  const key = new Uint8Array(16);
  expect(() => aes128CbcEncrypt(new Uint8Array(15), key, new Uint8Array(16))).toThrow(RangeError);
  expect(() => aes128CbcEncrypt(key, new Uint8Array(17), new Uint8Array(16))).toThrow(RangeError);
  expect(() => aes128CbcEncrypt(key, key, new Uint8Array(20))).toThrow(RangeError);
});
