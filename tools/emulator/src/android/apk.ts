import { runText } from '@huma/kit/process';

/** What the repository relies on in the manifest of a built APK. */
export type ApkManifest = Readonly<{
  packageName: string;
  targetSdk: number;
  /** `android:enableOnBackInvokedCallback` of the application; `null` when the manifest does not set it. */
  backInvokedCallback: boolean | null;
  /** Schemes of every intent filter, in manifest order. */
  schemes: readonly string[];
}>;

/** The prefix Expo gives the scheme that opens the dev client on a project. */
const DEV_CLIENT_SCHEME_PREFIX = 'exp+';

const ANDROID_ATTRIBUTE =
  /^\s*A: http:\/\/schemas\.android\.com\/apk\/res\/android:(?<name>\w+)\(0x[0-9a-f]+\)=(?<value>.*)$/u;

const STRING_VALUE = /^"(?<text>[^"]*)"/u;

/** The manifest of an APK, from the tree `aapt2 dump xmltree --file AndroidManifest.xml` prints. */
export function parseManifestTree(tree: string): ApkManifest {
  let packageName: string | null = null;
  let targetSdk: number | null = null;
  let backInvokedCallback: boolean | null = null;
  const schemes: string[] = [];
  for (const line of tree.split('\n')) {
    const declaredPackage = /^\s*A: package="(?<name>[^"]+)"/u.exec(line)?.groups?.['name'];
    if (declaredPackage !== undefined) {
      packageName = declaredPackage;
      continue;
    }
    const attribute = ANDROID_ATTRIBUTE.exec(line)?.groups;
    const value = attribute?.['value'] ?? '';
    switch (attribute?.['name']) {
      case 'targetSdkVersion':
        targetSdk = Number(value);
        break;
      case 'enableOnBackInvokedCallback':
        backInvokedCallback = value === 'true';
        break;
      case 'scheme': {
        const scheme = STRING_VALUE.exec(value)?.groups?.['text'];
        if (scheme !== undefined) {
          schemes.push(scheme);
        }
        break;
      }
      case undefined:
      default:
        break;
    }
  }
  if (packageName === null || targetSdk === null || !Number.isInteger(targetSdk)) {
    throw new Error('manifeste de l’APK illisible : paquet ou targetSdkVersion absent');
  }
  return { packageName, targetSdk, backInvokedCallback, schemes };
}

/** The scheme of the dev client's deep link: the one intent filter scheme Expo prefixes. */
export function devClientScheme(manifest: ApkManifest): string {
  const schemes = manifest.schemes.filter((scheme) => scheme.startsWith(DEV_CLIENT_SCHEME_PREFIX));
  const [scheme] = schemes;
  if (scheme === undefined || schemes.length > 1) {
    throw new Error(
      `${manifest.packageName} : ${String(schemes.length)} schéma(s) ${DEV_CLIENT_SCHEME_PREFIX}…, attendu 1`,
    );
  }
  return scheme;
}

/** Time aapt2 may take to read one manifest of an APK this workspace built. */
const AAPT2_TIMEOUT_MS = 60_000;

/** Reads the manifest of `apk` with the `aapt2` of the SDK's build tools. */
export const readApkManifest = async (aapt2: string, apk: string, cwd: string): Promise<ApkManifest> =>
  parseManifestTree(
    await runText(aapt2, ['dump', 'xmltree', '--file', 'AndroidManifest.xml', apk], {
      cwd,
      timeoutMs: AAPT2_TIMEOUT_MS,
    }),
  );
