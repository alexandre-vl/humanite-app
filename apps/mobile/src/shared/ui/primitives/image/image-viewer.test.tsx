import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';
import { asDisplayText } from '../../../lib/display-text';
import { layersOf, nearestAbove } from '../../../lib/testing';
import { ImageViewer } from './image-viewer';

const LABEL = asDisplayText('La photographie');
const close = jest.fn();
beforeEach(() => {
  close.mockClear();
});
const labels = {
  hint: asDisplayText('Actions disponibles'),
  enlarge: asDisplayText('Agrandir'),
  reduce: asDisplayText('Réduire'),
  showControls: asDisplayText('Afficher les commandes'),
  hideControls: asDisplayText('Masquer les commandes'),
  close: asDisplayText('Fermer'),
};
const viewer = (): ReactElement => (
  <ImageViewer
    source={1}
    recyclingKey="one"
    label={LABEL}
    labels={labels}
    onClose={close}
    controls={null}
    footer={null}
  />
);

const picture = (): ReturnType<typeof screen.getByRole> => screen.getByRole('image', { name: LABEL });

const position = (): unknown =>
  nearestAbove(
    screen.getByTestId('picture'),
    (node) => {
      const transformed = layersOf(node.props['style']).find((layer) => layer['transform'] !== undefined);
      return transformed?.['transform'];
    },
    'La photographie doit avoir une transformation',
  );

const open = async (): Promise<void> => {
  await render(viewer());
  const viewport = nearestAbove(
    picture(),
    (node) => (typeof node.props['onLayout'] === 'function' ? node : undefined),
    'Le cadre doit se mesurer',
  );
  await fireEvent(viewport, 'layout', { nativeEvent: { layout: { width: 400, height: 600 } } });
  await fireEvent(screen.getByTestId('picture'), 'load', { source: { width: 1200, height: 600 } });
};

describe('les gestes de la photographie en plein écran', () => {
  it('masque les commandes au toucher simple sans changer le cadre ou le zoom', async () => {
    await open();
    const before = position();
    expect(picture().props['accessibilityActions']).toContainEqual({
      name: 'controls',
      label: labels.hideControls,
    });
    await act(() => {
      fireGestureHandler<ReturnType<typeof Gesture.Tap>>(getByGestureTestId('picture-tap'), [{ x: 200, y: 300 }]);
    });
    expect(picture().props['accessibilityActions']).toContainEqual({
      name: 'controls',
      label: labels.showControls,
    });
    expect(position()).toEqual(before);
    await act(() => {
      fireGestureHandler<ReturnType<typeof Gesture.Tap>>(getByGestureTestId('picture-tap'), [{ x: 200, y: 300 }]);
    });
    expect(picture().props['accessibilityActions']).toContainEqual({
      name: 'controls',
      label: labels.hideControls,
    });
  });

  it('zoome vers le point touché et donne les mêmes actions au lecteur d’écran', async () => {
    await open();
    await act(() => {
      fireGestureHandler<ReturnType<typeof Gesture.Tap>>(getByGestureTestId('picture-double-tap'), [
        { x: 300, y: 300 },
      ]);
    });
    await screen.rerender(viewer());
    expect(position()).toEqual([{ translateX: -100 }, { translateY: 0 }, { scale: 2 }]);
    expect(picture().props['accessibilityActions']).toContainEqual({
      name: 'controls',
      label: labels.showControls,
    });
    await fireEvent(picture(), 'accessibilityAction', { nativeEvent: { actionName: 'reduce' } });
    await screen.rerender(viewer());
    expect(position()).toEqual([{ translateX: 0 }, { translateY: 0 }, { scale: 1 }]);
    await fireEvent(picture(), 'accessibilityAction', { nativeEvent: { actionName: 'enlarge' } });
    await screen.rerender(viewer());
    expect(position()).toEqual([{ translateX: 0 }, { translateY: 0 }, { scale: 2 }]);
    await fireEvent(picture(), 'accessibilityAction', { nativeEvent: { actionName: 'controls' } });
    expect(picture().props['accessibilityActions']).toContainEqual({
      name: 'controls',
      label: labels.hideControls,
    });
    await fireEvent(picture(), 'accessibilityAction', { nativeEvent: { actionName: 'close' } });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('zoome au pincement, borne le déplacement et revient à l’image entière au double toucher', async () => {
    await open();
    await act(() => {
      fireGestureHandler<ReturnType<typeof Gesture.Pinch>>(getByGestureTestId('picture-pinch'), [
        { scale: 1, focalX: 200, focalY: 300 },
        { scale: 8, focalX: 200, focalY: 300 },
      ]);
    });
    await screen.rerender(viewer());
    expect(position()).toEqual([{ translateX: 0 }, { translateY: 0 }, { scale: 4 }]);
    await act(() => {
      fireGestureHandler<ReturnType<typeof Gesture.Pan>>(getByGestureTestId('picture-pan'), [
        { translationX: 0, translationY: 0 },
        { translationX: 2000, translationY: -2000 },
      ]);
    });
    await screen.rerender(viewer());
    expect(position()).toEqual([{ translateX: 600 }, { translateY: -100 }, { scale: 4 }]);
    await act(() => {
      fireGestureHandler<ReturnType<typeof Gesture.Tap>>(getByGestureTestId('picture-double-tap'), [
        { x: 200, y: 300 },
      ]);
    });
    await screen.rerender(viewer());
    expect(position()).toEqual([{ translateX: 0 }, { translateY: 0 }, { scale: 1 }]);
  });

  it('ferme avec le retour système et remet le zoom à zéro après fermeture', async () => {
    await open();
    await act(() => {
      fireGestureHandler<ReturnType<typeof Gesture.Tap>>(getByGestureTestId('picture-double-tap'), [
        { x: 200, y: 300 },
      ]);
    });
    await screen.rerender(viewer());
    expect(position()).toEqual([{ translateX: 0 }, { translateY: 0 }, { scale: 2 }]);
    await fireEvent(picture(), 'requestClose');
    expect(close).toHaveBeenCalledTimes(1);
    await screen.unmount();
    await open();
    expect(position()).toEqual([{ translateX: 0 }, { translateY: 0 }, { scale: 1 }]);
  });
});
