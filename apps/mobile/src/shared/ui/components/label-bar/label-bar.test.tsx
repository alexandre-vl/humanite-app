import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { asDisplayText } from '../../../lib/display-text';
import { LabelBar } from './label-bar';

const ITEMS = [
  { id: 'front', label: asDisplayText('À la une') },
  { id: 'politique', label: asDisplayText('Politique') },
] as const;

describe('LabelBar', () => {
  /**
   * The rule under the chosen label is a colour and nothing else. The reference logs exactly that as a fault of the
   * screen this copies — a state told by colour alone is no state at all to a reader who cannot see it — and the band
   * carried the same fault until it said which choice was in force.
   */
  it('dit laquelle des bandes est en vigueur, et pas seulement en couleur', async () => {
    await render(<LabelBar items={ITEMS} active="politique" onSelect={jest.fn()} />);
    expect(screen.getByRole('radio', { name: 'Politique', selected: true })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'À la une', selected: false })).toBeTruthy();
  });

  /** A band nothing is chosen in claims no choice: announced as a row of radios, it would say that all are off. */
  it('ne se donne pas pour un choix quand aucune n’est en vigueur', async () => {
    await render(<LabelBar items={ITEMS} onSelect={jest.fn()} />);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByLabelText('Politique')).toBeTruthy();
  });

  it('rapporte le choix qu’on touche, par son identifiant', async () => {
    const chosen = jest.fn();
    await render(<LabelBar items={ITEMS} active="front" onSelect={chosen} />);
    await fireEvent.press(screen.getByLabelText('Politique'));
    expect(chosen).toHaveBeenCalledWith('politique');
  });

  /**
   * Ce que la rangée doit à la bande où elle est posée : l’endroit où chaque étiquette s’est arrêtée. Sans eux la
   * bande n’a ni règle à promener ni offset à viser — ce qu’une étiquette mesure dépend de son mot, de sa fonte et
   * du pas que le lecteur a réglé, et personne ne peut le calculer d’avance.
   */
  it('rapporte où ses étiquettes se sont posées, dans leur ordre, une fois toutes mesurées', async () => {
    const places = jest.fn();
    await render(<LabelBar items={ITEMS} active="front" onSelect={jest.fn()} onPlaces={places} />);
    await fireEvent(screen.getByLabelText('À la une'), 'layout', { nativeEvent: { layout: { x: 0, width: 100 } } });
    await fireEvent(screen.getByLabelText('Politique'), 'layout', { nativeEvent: { layout: { x: 100, width: 60 } } });
    expect(places).toHaveBeenLastCalledWith([
      { x: 0, width: 100 },
      { x: 100, width: 60 },
    ]);
  });

  /** Une seule mesure ne dit rien de la rangée : la bande viserait une place et en trouverait une autre à côté. */
  it('ne rapporte rien tant qu’une étiquette n’est pas mesurée', async () => {
    const places = jest.fn();
    await render(<LabelBar items={ITEMS} active="front" onSelect={jest.fn()} onPlaces={places} />);
    await fireEvent(screen.getByLabelText('À la une'), 'layout', { nativeEvent: { layout: { x: 0, width: 100 } } });
    expect(places).not.toHaveBeenCalled();
  });
});
