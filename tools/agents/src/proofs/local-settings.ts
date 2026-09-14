import { fixtureFactory } from '@huma/fixtures';
import type { LocalSettingsCode } from '../local-settings.ts';
import { checkLocalSettings } from '../local-settings.ts';

const define = fixtureFactory<LocalSettingsCode>();

const checked = (text: string | null) => async (): Promise<readonly LocalSettingsCode[]> =>
  Promise.resolve(checkLocalSettings(text).map((finding) => finding.code));

export const LOCAL_SETTINGS_FIXTURES = [
  define('agent/valid-no-local-settings', 'aucun réglage local', [], checked(null)),
  define(
    'agent/valid-local-permissions',
    'des réglages locaux qui gardent des choix de permission',
    [],
    checked('{"permissions":{"allow":["Bash(ls:*)"]},"disableAllHooks":false}'),
  ),
  define(
    'agent/local-settings-hooks-disabled',
    'des réglages locaux qui coupent les hooks du dépôt',
    ['agent/local-settings-hooks-disabled'],
    checked('{"disableAllHooks":true}'),
  ),
  define(
    'agent/local-settings-unreadable',
    'des réglages locaux qui ne sont pas un objet JSON',
    ['agent/local-settings-unreadable'],
    checked('{"disableAllHooks":'),
  ),
] as const;
