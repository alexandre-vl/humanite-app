import { expect, test } from 'vitest';
import { devClientScheme, parseManifestTree } from './apk.ts';

const ANDROID = 'http://schemas.android.com/apk/res/android';

const tree = (schemes: readonly string[]): string =>
  [
    `N: android=${ANDROID} (line=2)`,
    '  E: manifest (line=2)',
    `    A: ${ANDROID}:versionCode(0x0101021b)=1`,
    '    A: package="dev.humanite.app" (Raw: "dev.humanite.app")',
    '      E: uses-sdk (line=7)',
    `        A: ${ANDROID}:targetSdkVersion(0x01010270)=36`,
    '      E: application (line=55)',
    `        A: ${ANDROID}:enableOnBackInvokedCallback(0x0101066c)=false`,
    '          E: activity (line=81)',
    '              E: intent-filter (line=94)',
    ...schemes.flatMap((scheme) => [
      '                  E: data (line=100)',
      `                    A: ${ANDROID}:scheme(0x01010027)="${scheme}" (Raw: "${scheme}")`,
    ]),
    '',
  ].join('\n');

test('reads the package, the target SDK, the back callback and the schemes of a manifest tree', () => {
  expect(parseManifestTree(tree(['humanite', 'exp+humanite']))).toEqual({
    packageName: 'dev.humanite.app',
    targetSdk: 36,
    backInvokedCallback: false,
    schemes: ['humanite', 'exp+humanite'],
  });
  expect(() => parseManifestTree('N: android\n')).toThrow('illisible');
});

test('the dev client scheme is the one scheme Expo prefixes', () => {
  expect(devClientScheme(parseManifestTree(tree(['humanite', 'exp+humanite'])))).toBe('exp+humanite');
  expect(() => devClientScheme(parseManifestTree(tree(['humanite'])))).toThrow('0 schéma');
  expect(() => devClientScheme(parseManifestTree(tree(['exp+a', 'exp+b'])))).toThrow('2 schéma');
});
