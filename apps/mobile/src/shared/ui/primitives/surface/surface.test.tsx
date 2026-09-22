import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { StartupProvider, useStartup } from '../../../lib/startup';
import { Surface } from './surface';

/** Shows whether anything has reported a first layout yet. */
function Watcher(): ReactNode {
  const { firstLayoutDone } = useStartup();
  return <View testID={firstLayoutDone ? 'done' : 'waiting'} />;
}

/** The layout a view reports, which a headless renderer never measures and so never sends on its own. */
const LAYOUT = { nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 900 } } };

const groundOf = (): Parameters<typeof fireEvent>[0] => {
  const ground = screen.getByTestId('content').parent;
  if (ground === null) {
    throw new Error('le sol n’a pas de vue : le test ne vérifierait rien');
  }
  return ground;
};

describe('Surface', () => {
  it('signale sa première mise en page à qui retient l’écran de lancement', async () => {
    await render(
      <StartupProvider>
        <Surface>
          <View testID="content" />
        </Surface>
        <Watcher />
      </StartupProvider>,
    );
    expect(screen.getByTestId('waiting')).toBeTruthy();
    await fireEvent(groundOf(), 'layout', LAYOUT);
    expect(await screen.findByTestId('done')).toBeTruthy();
  });

  it('se dessine là où aucun écran de lancement ne l’attend, sans rien signaler', async () => {
    await render(
      <Surface>
        <View testID="content" />
      </Surface>,
    );
    await fireEvent(groundOf(), 'layout', LAYOUT);
    expect(screen.getByTestId('content')).toBeTruthy();
  });
});
