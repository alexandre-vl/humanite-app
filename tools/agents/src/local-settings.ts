import type { CheckCodeOf } from '@huma/kit/checks';
import { defineChecks } from '@huma/kit/checks';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { parseJson } from '@huma/kit/json';
import { repoPath } from '@huma/kit/paths';
import { isRecord } from '@huma/unknown';
import { CLAUDE_LOCAL_SETTINGS_PATH } from './policy.ts';

/**
 * `.claude/settings.local.json` is ignored by git, so no commit shows it: Claude Code writes permission choices into it,
 * and a line in it can switch off every hook of the repository. This check is the backstop the guard cannot be.
 */
const TABLE = {
  'agent/local-settings-hooks-disabled': {
    summary: 'les réglages locaux de Claude Code gardent les hooks du dépôt',
    message: 'disableAllHooks dans les réglages locaux : les hooks du dépôt ne s’exécutent plus ; retirer la clé',
  },
  'agent/local-settings-unreadable': {
    summary: 'les réglages locaux de Claude Code se lisent',
    message: 'réglages locaux illisibles : Claude Code pourrait les lire autrement que ce contrôle',
  },
} as const;

const LOCAL_SETTINGS_CHECKS = defineChecks(TABLE);

export type LocalSettingsCode = CheckCodeOf<typeof TABLE>;

/** Findings on the text of the local settings file, `null` when the file does not exist. */
export function checkLocalSettings(text: string | null): readonly Diagnostic<LocalSettingsCode>[] {
  if (text === null) {
    return [];
  }
  const path = repoPath(CLAUDE_LOCAL_SETTINGS_PATH);
  const settings = parseJson(text);
  if (!isRecord(settings)) {
    return [LOCAL_SETTINGS_CHECKS.finding('agent/local-settings-unreadable', path, {})];
  }
  return settings['disableAllHooks'] === undefined || settings['disableAllHooks'] === false
    ? []
    : [LOCAL_SETTINGS_CHECKS.finding('agent/local-settings-hooks-disabled', path, {})];
}
