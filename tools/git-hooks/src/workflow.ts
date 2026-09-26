import type { Diagnostic } from '@huma/kit/diagnostics';
import { describeError } from '@huma/kit/errors';
import type { RepoPath } from '@huma/kit/paths';
import { repoPath } from '@huma/kit/paths';
import { parse } from 'yaml';
import { z } from 'zod';
import type { GitHookCode } from './checks.ts';
import { gitHookFinding } from './checks.ts';

/** The workflow that replays the hooks on the server, at every push to main and every pull request. */
export const CI_WORKFLOW = repoPath('.github/workflows/ci.yml');

/** The workflow that publishes a version from a tag. */
export const RELEASE_WORKFLOW = repoPath('.github/workflows/release.yml');

/** What the two workflows hold, as read from the tree; `null` for one that is not there. */
export type WorkflowTexts = Readonly<{ ci: string | null; release: string | null }>;

const STEP = z.object({
  uses: z.string().optional(),
  run: z.string().optional(),
  with: z.record(z.string(), z.unknown()).optional(),
});

const JOB = z.object({
  permissions: z.unknown().optional(),
  env: z.record(z.string(), z.unknown()).optional(),
  steps: z.array(STEP).default([]),
});

const WORKFLOW = z.object({
  on: z.record(z.string(), z.unknown()),
  permissions: z.unknown().optional(),
  env: z.record(z.string(), z.unknown()).optional(),
  jobs: z.record(z.string(), JOB),
});

type Job = z.infer<typeof JOB>;
type Workflow = z.infer<typeof WORKFLOW>;

/** A push trigger as the two workflows write it: to branches, or to tags. */
const PUSH = z.object({ branches: z.array(z.string()).optional(), tags: z.array(z.string()).optional() });

/** A token that only reads: everything at `read`, per scope or at once. */
const READ_ONLY = z.union([z.literal('read-all'), z.record(z.string(), z.enum(['read', 'none']))]);

/** An action pinned to a commit: a name, then a full SHA — a tag or a branch moves under the same name. */
const PINNED = /^[^@\s]+@[0-9a-f]{40}$/u;

/** The variables that carry the identity lent to the maintainer's tests (ADR-0032), which no workflow may name. */
const IDENTITY = /\bEXPO_PUBLIC_(?:APP_SECRET|DEVICE_[A-Z_]+)\b/gu;

/** How a workflow reads a secret. */
const SECRET = /\bsecrets\.([A-Za-z_]\w*)/gu;

/** The only secrets a workflow may read: the key the release signs with, and only there. */
const SIGNING_KEY = new Set(['ANDROID_RELEASE_KEYSTORE', 'ANDROID_RELEASE_KEYSTORE_PASSWORD']);

/** A step that scans the whole history for secrets, the binary called by its name or by a path to it. */
const HISTORY_SCAN = /gitleaks"?\s+git\b/u;

/** A job that builds the app: it generates the native project first. */
const PREBUILD = /\bexpo prebuild\b/u;

/** The variable a build asks for the identity of the releases with (ADR-0039), which only the release may name. */
const VARIANT = /\bAPP_VARIANT\b/u;

type Reading = Readonly<{ workflow: Workflow }> | Readonly<{ finding: Diagnostic<GitHookCode> }>;

/** The YAML `text` holds, or why the parser refused it. */
function parsed(text: string): Readonly<{ value: unknown }> | Readonly<{ error: string }> {
  try {
    return { value: parse(text) };
  } catch (error) {
    return { error: describeError(error) };
  }
}

/** The workflow at `path`, or the one finding that says why it cannot be judged. */
function read(path: RepoPath, text: string | null): Reading {
  if (text === null) {
    return { finding: gitHookFinding('git/ci-missing', path, { path }) };
  }
  const yaml = parsed(text);
  if ('error' in yaml) {
    return { finding: gitHookFinding('git/ci-unreadable', path, { path, reason: yaml.error }) };
  }
  const result = WORKFLOW.safeParse(yaml.value);
  if (!result.success) {
    const [issue] = result.error.issues;
    const reason = issue === undefined ? 'forme inattendue' : `${issue.path.join('.')} : ${issue.message}`;
    return { finding: gitHookFinding('git/ci-unreadable', path, { path, reason }) };
  }
  return { workflow: result.data };
}

const stepIndex = (job: Job, command: string): number =>
  job.steps.findIndex((step) => step.run?.includes(command) ?? false);

const checkoutOf = (job: Job): z.infer<typeof STEP> | undefined =>
  job.steps.find((step) => step.uses?.startsWith('actions/checkout@') ?? false);

const cloneIsFull = (job: Job): boolean => checkoutOf(job)?.with?.['fetch-depth'] === 0;

const buildsApp = (job: Job): boolean => job.steps.some((step) => PREBUILD.test(step.run ?? ''));

/** What the steps of `job` read for `name`: the job's own value, or else the workflow's. */
const envOf = (workflow: Workflow, job: Job, name: string): unknown => job.env?.[name] ?? workflow.env?.[name];

const checksOutHead = (job: Job): boolean => {
  const ref = checkoutOf(job)?.with?.['ref'];
  return typeof ref === 'string' && ref.includes('github.event.pull_request.head.sha');
};

/** Every action is pinned, the token only reads at the top, and no step reads the identity or a foreign secret. */
function checkCommon(
  path: RepoPath,
  text: string,
  workflow: Workflow,
  secrets: ReadonlySet<string>,
): readonly Diagnostic<GitHookCode>[] {
  const findings: Diagnostic<GitHookCode>[] = [];
  for (const job of Object.values(workflow.jobs)) {
    for (const action of job.steps.flatMap((step) => (step.uses === undefined ? [] : [step.uses]))) {
      if (!action.startsWith('./') && !PINNED.test(action)) {
        findings.push(gitHookFinding('git/ci-unpinned', path, { action, path }));
      }
    }
  }
  if (!READ_ONLY.safeParse(workflow.permissions).success) {
    findings.push(gitHookFinding('git/ci-permissions', path, { scope: 'du workflow', path }));
  }
  const named = new Set([
    ...[...text.matchAll(IDENTITY)].map(([name]) => name),
    ...[...text.matchAll(SECRET)].flatMap(([reference, name = '']) => (secrets.has(name) ? [] : [reference])),
  ]);
  for (const name of named) {
    findings.push(gitHookFinding('git/ci-identity', path, { path, name }));
  }
  for (const [name, job] of Object.entries(workflow.jobs)) {
    if (buildsApp(job) && envOf(workflow, job, 'EXPO_PUBLIC_CONTENT_SOURCE') !== 'service') {
      findings.push(gitHookFinding('git/ci-variant', path, { job: name, path }));
    }
  }
  return findings;
}

/**
 * The CI: every push to main and every pull request, verified on a full clone at its head, and searched for secrets;
 * what it builds keeps the `.dev` identity of the debug key.
 */
function checkIntegration(text: string, workflow: Workflow): readonly Diagnostic<GitHookCode>[] {
  const path = CI_WORKFLOW;
  const findings: Diagnostic<GitHookCode>[] = [...checkCommon(path, text, workflow, new Set())];
  if (VARIANT.test(text)) {
    findings.push(gitHookFinding('git/ci-release-identity', path, { path }));
  }
  const push = PUSH.safeParse(workflow.on['push']);
  if (!(push.success && (push.data.branches ?? []).includes('main') && Object.hasOwn(workflow.on, 'pull_request'))) {
    findings.push(gitHookFinding('git/ci-trigger', path, { path, expected: 'push sur main et pull_request' }));
  }
  for (const [name, job] of Object.entries(workflow.jobs)) {
    if (job.permissions !== undefined && !READ_ONLY.safeParse(job.permissions).success) {
      findings.push(gitHookFinding('git/ci-permissions', path, { scope: `du job ${name}`, path }));
    }
  }
  const verifying = Object.entries(workflow.jobs).filter(([, job]) => {
    const install = stepIndex(job, 'pnpm hooks:install');
    return install >= 0 && stepIndex(job, 'pnpm verify') > install;
  });
  if (verifying.length === 0) {
    findings.push(gitHookFinding('git/ci-verify', path, { path }));
  }
  for (const [name, job] of verifying) {
    if (!cloneIsFull(job)) {
      findings.push(gitHookFinding('git/ci-shallow', path, { job: name }));
    }
    if (!checksOutHead(job)) {
      findings.push(gitHookFinding('git/ci-merge-ref', path, { job: name }));
    }
  }
  const scanning = Object.entries(workflow.jobs).filter(([, job]) =>
    job.steps.some((step) => HISTORY_SCAN.test(step.run ?? '')),
  );
  if (scanning.length === 0) {
    findings.push(gitHookFinding('git/ci-secrets', path, { path }));
  }
  for (const [name, job] of scanning) {
    if (!cloneIsFull(job)) {
      findings.push(gitHookFinding('git/ci-shallow', path, { job: name }));
    }
  }
  return findings;
}

/**
 * The release: a tag and nothing else starts it, it reads no secret but the key it signs with, and what it builds has
 * the identity of the releases.
 */
function checkRelease(text: string, workflow: Workflow): readonly Diagnostic<GitHookCode>[] {
  const path = RELEASE_WORKFLOW;
  const findings: Diagnostic<GitHookCode>[] = [...checkCommon(path, text, workflow, SIGNING_KEY)];
  for (const [name, job] of Object.entries(workflow.jobs)) {
    if (buildsApp(job) && envOf(workflow, job, 'APP_VARIANT') !== 'release') {
      findings.push(gitHookFinding('git/release-identity', path, { job: name, path }));
    }
  }
  const push = PUSH.safeParse(workflow.on['push']);
  const onTagsOnly =
    Object.keys(workflow.on).length === 1 &&
    push.success &&
    push.data.branches === undefined &&
    (push.data.tags ?? []).length > 0 &&
    (push.data.tags ?? []).every((pattern) => pattern.startsWith('v'));
  if (!onTagsOnly) {
    findings.push(gitHookFinding('git/ci-trigger', path, { path, expected: 'un push de tag v* seulement' }));
  }
  return findings;
}

/**
 * The two workflows that carry the rules of ADR-0038 to the server. The hooks cannot see a commit made elsewhere, nor
 * one a contributor made with `--no-verify`: the CI does, so what it runs is checked here, where a change to it is
 * judged before it lands.
 */
export function checkWorkflows(texts: WorkflowTexts): readonly Diagnostic<GitHookCode>[] {
  const integration = read(CI_WORKFLOW, texts.ci);
  const release = read(RELEASE_WORKFLOW, texts.release);
  return [
    ...('finding' in integration ? [integration.finding] : checkIntegration(texts.ci ?? '', integration.workflow)),
    ...('finding' in release ? [release.finding] : checkRelease(texts.release ?? '', release.workflow)),
  ];
}
