import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixtureFactory } from '@huma/fixtures';
import { findWorkspaceRoot } from '@huma/kit/cli';
import { stringify } from 'yaml';
import type { GitHookCode } from '../checks.ts';
import type { WorkflowTexts } from '../workflow.ts';
import { checkWorkflows, CI_WORKFLOW, RELEASE_WORKFLOW } from '../workflow.ts';

const define = fixtureFactory<GitHookCode>();

const judged = (texts: WorkflowTexts) => async (): Promise<readonly GitHookCode[]> =>
  Promise.resolve(checkWorkflows(texts).map((finding) => finding.code));

/** A commit of the checkout action: forty hex signs pin it, and no fixture fetches it. */
const CHECKOUT = 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1';

/** What the checkout of a pull request names: its head, and the branch pushed when there is no pull request. */
const HEAD = 'github.event.pull_request.head.sha || github.ref';

const PREBUILD = { run: 'pnpm exec expo prebuild --platform android --no-install' };

type Plan = Readonly<Record<string, unknown>>;

const VERIFY_STEPS = [{ run: 'pnpm install --frozen-lockfile' }, { run: 'pnpm hooks:install' }, { run: 'pnpm verify' }];

const CI_JOBS: Plan = {
  verify: { steps: [{ uses: CHECKOUT, with: { 'fetch-depth': 0, ref: HEAD } }, ...VERIFY_STEPS] },
  secrets: { steps: [{ uses: CHECKOUT, with: { 'fetch-depth': 0 } }, { run: 'gitleaks git --redact .' }] },
  android: { env: { EXPO_PUBLIC_CONTENT_SOURCE: 'service' }, steps: [{ uses: CHECKOUT }, PREBUILD] },
};

/**
 * The smallest CI the rules accept — verified at the head of a full clone, searched for secrets, built as the service —
 * with `top` replacing its keys and `jobs` its jobs.
 */
const ci = (jobs: Plan = {}, top: Plan = {}): string =>
  stringify({
    on: { push: { branches: ['main'] }, pull_request: { branches: ['main'] } },
    permissions: { contents: 'read' },
    ...top,
    jobs: { ...CI_JOBS, ...jobs },
  });

/** What every build of a release is given: the service, under the identity of the releases. */
const RELEASE_ENV = { EXPO_PUBLIC_CONTENT_SOURCE: 'service', APP_VARIANT: 'release' };

/**
 * The smallest release the rules accept — a tag starts it, it builds the service under the identity of the releases,
 * and signs with its own key.
 */
const release = (top: Plan = {}): string =>
  stringify({
    on: { push: { tags: ['v*.*.*'] } },
    permissions: { contents: 'read' },
    env: RELEASE_ENV,
    ...top,
    jobs: {
      android: {
        steps: [
          { uses: CHECKOUT },
          PREBUILD,
          { run: 'apksigner sign', env: { KEYSTORE: 'secrets.ANDROID_RELEASE_KEYSTORE' } },
        ],
      },
      publish: { permissions: { contents: 'write' }, steps: [{ run: 'gh release create' }] },
    },
  });

export const WORKFLOW_FIXTURES = [
  define(
    'git/valid-workflows',
    'les workflows que le dépôt suit, tels qu’ils sont',
    [],
    async (): Promise<readonly GitHookCode[]> => {
      const root = await findWorkspaceRoot(import.meta.dirname);
      const [integration, publication] = await Promise.all([
        readFile(join(root, CI_WORKFLOW), 'utf8'),
        readFile(join(root, RELEASE_WORKFLOW), 'utf8'),
      ]);
      return checkWorkflows({ ci: integration, release: publication }).map((finding) => finding.code);
    },
  ),
  define(
    'git/valid-workflow-plans',
    'la plus petite CI et la plus petite release admises',
    [],
    judged({ ci: ci(), release: release() }),
  ),
  define('git/ci-missing', 'une release sans workflow', ['git/ci-missing'], judged({ ci: ci(), release: null })),
  define(
    'git/ci-unreadable',
    'une CI qui n’est pas du YAML',
    ['git/ci-unreadable'],
    judged({ ci: 'on: [push\n', release: release() }),
  ),
  define(
    'git/ci-trigger',
    'une CI qui ne tourne pas sur les pull requests',
    ['git/ci-trigger'],
    judged({ ci: ci({}, { on: { push: { branches: ['main'] } } }), release: release() }),
  ),
  define(
    'git/ci-release-trigger',
    'une release qui part d’un push sur main',
    ['git/ci-trigger'],
    judged({ ci: ci(), release: release({ on: { push: { branches: ['main'] } } }) }),
  ),
  define(
    'git/ci-verify',
    'une CI qui lance pnpm verify sans installer les hooks',
    ['git/ci-verify'],
    judged({
      ci: ci({
        verify: { steps: [{ uses: CHECKOUT, with: { 'fetch-depth': 0, ref: HEAD } }, { run: 'pnpm verify' }] },
      }),
      release: release(),
    }),
  ),
  define(
    'git/ci-shallow',
    'une CI qui vérifie sur un clone superficiel',
    ['git/ci-shallow'],
    judged({
      ci: ci({ verify: { steps: [{ uses: CHECKOUT, with: { ref: HEAD } }, ...VERIFY_STEPS] } }),
      release: release(),
    }),
  ),
  define(
    'git/ci-merge-ref',
    'une CI qui vérifie le commit de fusion d’une pull request',
    ['git/ci-merge-ref'],
    judged({
      ci: ci({ verify: { steps: [{ uses: CHECKOUT, with: { 'fetch-depth': 0 } }, ...VERIFY_STEPS] } }),
      release: release(),
    }),
  ),
  define(
    'git/ci-secrets',
    'une CI qui ne cherche plus de secret dans l’historique',
    ['git/ci-secrets'],
    judged({ ci: ci({ secrets: { steps: [{ uses: CHECKOUT }, { run: 'echo rien' }] } }), release: release() }),
  ),
  define(
    'git/ci-unpinned',
    'une action désignée par une étiquette qui peut bouger',
    ['git/ci-unpinned'],
    judged({
      ci: ci({
        android: { env: { EXPO_PUBLIC_CONTENT_SOURCE: 'service' }, steps: [{ uses: 'actions/checkout@v7' }, PREBUILD] },
      }),
      release: release(),
    }),
  ),
  define(
    'git/ci-permissions',
    'une CI dont le jeton peut écrire',
    ['git/ci-permissions'],
    judged({ ci: ci({}, { permissions: { contents: 'write' } }), release: release() }),
  ),
  define(
    'git/ci-identity',
    'une release qui fait porter au binaire la clé prêtée aux tests',
    ['git/ci-identity'],
    judged({
      ci: ci(),
      release: release({ env: { ...RELEASE_ENV, EXPO_PUBLIC_APP_SECRET: 'prêtée' } }),
    }),
  ),
  define(
    'git/ci-foreign-secret',
    'une CI qui lit un secret, quand seule la release lit sa clé',
    ['git/ci-identity'],
    judged({
      ci: ci({
        secrets: {
          steps: [
            { uses: CHECKOUT, with: { 'fetch-depth': 0 } },
            { run: 'gitleaks git .', env: { T: 'secrets.TOKEN' } },
          ],
        },
      }),
      release: release(),
    }),
  ),
  define(
    'git/ci-variant',
    'une release qui construit l’app sur le corpus fictif',
    ['git/ci-variant'],
    judged({ ci: ci(), release: release({ env: { APP_VARIANT: 'release' } }) }),
  ),
  define(
    'git/release-identity',
    'une release qui publierait l’identité .dev',
    ['git/release-identity'],
    judged({ ci: ci(), release: release({ env: { EXPO_PUBLIC_CONTENT_SOURCE: 'service' } }) }),
  ),
  define(
    'git/ci-release-identity',
    'une CI qui construit sous l’identité des releases',
    ['git/ci-release-identity'],
    judged({
      ci: ci({
        android: { env: { EXPO_PUBLIC_CONTENT_SOURCE: 'service', APP_VARIANT: 'release' }, steps: [PREBUILD] },
      }),
      release: release(),
    }),
  ),
] as const;
