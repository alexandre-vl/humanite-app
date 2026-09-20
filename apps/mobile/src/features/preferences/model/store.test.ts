import { beforeEach, describe, expect, it } from '@jest/globals';
import { STORAGE_KEYS, storage } from '#lib/storage';
import { usePreferences } from './store';

/** What the store wrote, as it wrote it. */
const onDisk = (): unknown => JSON.parse(storage.getString(STORAGE_KEYS.preferences) ?? 'null');

/** What a disk would hold, so a rehydration can be made to read it. */
const writeDisk = async (state: unknown): Promise<void> => {
  storage.set(STORAGE_KEYS.preferences, JSON.stringify({ state, version: 1 }));
  await usePreferences.persist.rehydrate();
};

beforeEach(() => {
  usePreferences.setState({ theme: 'system', scale: 'normal' });
});

describe('usePreferences', () => {
  it('part du téléphone pour les couleurs et du journal pour la taille', () => {
    expect(usePreferences.getState().theme).toBe('system');
    expect(usePreferences.getState().scale).toBe('normal');
  });

  it('écrit sous la clé du registre, avec la version de ce qu’il écrit', () => {
    usePreferences.getState().chooseTheme('dark');
    usePreferences.getState().chooseScale('large');
    expect(onDisk()).toEqual({ state: { theme: 'dark', scale: 'large' }, version: 1 });
  });

  /**
   * A file on a phone is not a value the type system has ever seen. Each name is read against the closed list of what
   * it may be, so nothing downstream ever paints in a theme that does not exist or sets type at a step never measured.
   */
  it('ne croit pas sur parole ce que le disque dit d’un réglage', async () => {
    await writeDisk({ theme: 'sépia', scale: 42 });
    expect(usePreferences.getState().theme).toBe('system');
    expect(usePreferences.getState().scale).toBe('normal');
  });

  it('repart de rien quand le disque ne porte pas la forme attendue', async () => {
    await writeDisk('sombre');
    expect(usePreferences.getState().theme).toBe('system');
  });

  /**
   * The shape a setting is added to does not move: a name the disk does not hold falls back to the paper's own value,
   * so a file written before that setting existed still reads correctly, and no version has to be bumped for it.
   */
  it('garde ce qu’un disque plus ancien porte, et complète ce qu’il ne porte pas', async () => {
    await writeDisk({ theme: 'light' });
    expect(usePreferences.getState().theme).toBe('light');
    expect(usePreferences.getState().scale).toBe('normal');
  });
});
