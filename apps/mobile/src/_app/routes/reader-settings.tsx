import type { ReactNode } from 'react';
import { usePreferences } from '#features/preferences';
import { TypesettingProvider } from '#lib/styles';
import { ThemeRoot } from '#primitives/theme';

/**
 * The whole app, printed the way the reader asked for it.
 *
 * This is the one place that reads what they set, because it is the one place allowed to: the settings are kept by a
 * store, a store belongs to the layer of actions, and neither a primitive nor a shared library may reach that layer.
 * Below here, a theme and a typesetting travel on contexts of their own and every style resolves through them, so no
 * screen and no component ever names a setting — which is also what makes the settings screen its own preview, the
 * sample it prints being set by the same two contexts as the article it stands for.
 */
export function ReaderSettings({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  const choice = usePreferences((settings) => settings.theme);
  const scale = usePreferences((settings) => settings.scale);
  const faces = usePreferences((settings) => settings.faces);
  return (
    <ThemeRoot choice={choice}>
      <TypesettingProvider typesetting={{ scale, faces }}>{children}</TypesettingProvider>
    </ThemeRoot>
  );
}
