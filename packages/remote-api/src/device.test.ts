import { expect, test } from 'vitest';
import { DEVICE_CRYPT_MODE, mintDeviceToken } from './device.ts';

test('the mode is the one the service reads', () => {
  expect(DEVICE_CRYPT_MODE).toBe('jdly');
});

test('mints a hex token of whole cipher blocks', () => {
  const token = mintDeviceToken('AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE');
  expect(token).toMatch(/^[0-9a-f]+$/u);
  expect(token.length % 32).toBe(0); // 16-byte blocks, two hex digits a byte
});

test('mints the attestation the service accepts for a given identifier', () => {
  // A regression vector for the exact bytes the service is sent. Decrypted under the client's key during development
  // (against the platform's AES), it reads `{ "id": "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE", "sgn": "", "sgn_ver":
  // "4.0" }`, and the live service issues an anonymous token for it (2026-09-26).
  expect(mintDeviceToken('AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE')).toBe(
    '0eba45187f1623ea1602f03ecbc679ea7cab099ceec9621b158325ccb681ceef' +
      '894adf11479d91401b6f481dbf92d95ea3a8ea89726ae2848ec00e661cda20f8' +
      '76b249a10f8ec66c1bbb805d722ec639350f67d1cf87a0121f7dd621a9a16e49',
  );
});

test('mints the same token for one identifier, and a different one for another', () => {
  expect(mintDeviceToken('un-appareil')).toBe(mintDeviceToken('un-appareil'));
  expect(mintDeviceToken('un-appareil')).not.toBe(mintDeviceToken('un-autre'));
});
