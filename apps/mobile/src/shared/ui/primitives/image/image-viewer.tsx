import type { DisplayText } from '@huma/contracts';
import { PALETTE, SPACING } from '@huma/design-tokens';
import { Image as ExpoImage } from 'expo-image';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Modal, StatusBar, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { createStyles } from '../../../lib/styles';
import type { ImageProps } from './image';
import { boundedOffset, boundedScale, scaledOffset } from './zoom';

type ImageViewerProps = Pick<ImageProps, 'source' | 'recyclingKey' | 'thumbhash' | 'standingIn'> &
  Readonly<{
    label: DisplayText;
    labels: Readonly<{
      hint: DisplayText;
      enlarge: DisplayText;
      reduce: DisplayText;
      showControls: DisplayText;
      hideControls: DisplayText;
      close: DisplayText;
    }>;
    onClose: () => void;
    controls: ReactNode;
    footer: ReactNode;
    initialRatio?: number | undefined;
    presentation?: 'modal' | 'screen';
    renderTarget?: ((picture: ReactNode) => ReactNode) | undefined;
    onZoomChange?: ((zoomed: boolean) => void) | undefined;
  }>;

const unchanged = (picture: ReactNode): ReactNode => picture;

const ZOOM_DURATION = 240;
const CONTROLS_DURATION = 180;

const useStyles = createStyles(() => ({
  screen: { flex: 1, backgroundColor: PALETTE.black },
  fill: { flex: 1 },
  viewport: { flex: 1, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  gestures: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', alignItems: 'center' },
  overlay: { position: 'absolute', top: SPACING.none, right: SPACING.none, bottom: SPACING.none, left: SPACING.none },
  commands: { flex: 1, justifyContent: 'space-between' },
  caption: { backgroundColor: PALETTE.black },
}));

/** Mounted only while open: closing discards the zoom and Android Back dismisses the native modal. */
export function ImageViewer({
  source,
  recyclingKey,
  thumbhash,
  standingIn,
  label,
  labels,
  onClose,
  controls,
  footer,
  presentation = 'modal',
  initialRatio = 1,
  renderTarget = unchanged,
  onZoomChange,
}: ImageViewerProps): ReactNode {
  const styles = useStyles();
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsOpacity = useSharedValue(1);
  useEffect(() => {
    controlsOpacity.set(withTiming(controlsVisible ? 1 : 0, { duration: CONTROLS_DURATION }));
  }, [controlsOpacity, controlsVisible]);
  const chrome = useAnimatedStyle(() => ({ opacity: controlsOpacity.get() }));
  const toggleControls = (): void => {
    setControlsVisible((visible) => !visible);
  };
  const hideControls = (): void => {
    setControlsVisible(false);
  };
  const window = useWindowDimensions();
  const width = useSharedValue(window.width);
  const height = useSharedValue(window.height);
  const ratio = useSharedValue(initialRatio);
  const scale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const focusX = useSharedValue(0);
  const focusY = useSharedValue(0);

  useAnimatedReaction(
    () => scale.get() > 1,
    (zoomed, before) => {
      if (zoomed !== before && onZoomChange !== undefined) {
        scheduleOnRN(onZoomChange, zoomed);
      }
    },
    [onZoomChange],
  );

  const fitted = useAnimatedStyle(() => ({
    width: Math.min(width.get(), height.get() * ratio.get()),
    height: Math.min(height.get(), width.get() / ratio.get()),
  }));

  const move = (nextScale: number, nextX: number, nextY: number, animated = false): void => {
    'worklet';
    const fittedWidth = Math.min(width.get(), height.get() * ratio.get());
    const fittedHeight = Math.min(height.get(), width.get() / ratio.get());
    const left = boundedOffset(nextX, fittedWidth, width.get(), nextScale);
    const top = boundedOffset(nextY, fittedHeight, height.get(), nextScale);
    scale.set(animated ? withTiming(nextScale, { duration: ZOOM_DURATION }) : nextScale);
    x.set(animated ? withTiming(left, { duration: ZOOM_DURATION }) : left);
    y.set(animated ? withTiming(top, { duration: ZOOM_DURATION }) : top);
  };
  const resize = (next: number, atX = 0, atY = 0): void => {
    'worklet';
    const after = boundedScale(next);
    move(after, scaledOffset(x.get(), atX, scale.get(), after), scaledOffset(y.get(), atY, scale.get(), after), true);
  };
  const stopZoom = (): void => {
    'worklet';
    cancelAnimation(scale);
    cancelAnimation(x);
    cancelAnimation(y);
  };
  const pinch = Gesture.Pinch()
    .withTestId('picture-pinch')
    .onStart((event) => {
      stopZoom();
      scheduleOnRN(hideControls);
      startScale.set(scale.get());
      startX.set(x.get());
      startY.set(y.get());
      focusX.set(event.focalX - width.get() / 2);
      focusY.set(event.focalY - height.get() / 2);
    })
    .onUpdate((event) => {
      const next = boundedScale(startScale.get() * event.scale);
      move(
        next,
        scaledOffset(startX.get(), focusX.get(), startScale.get(), next) +
          event.focalX -
          width.get() / 2 -
          focusX.get(),
        scaledOffset(startY.get(), focusY.get(), startScale.get(), next) +
          event.focalY -
          height.get() / 2 -
          focusY.get(),
      );
    });
  const pan = Gesture.Pan()
    .withTestId('picture-pan')
    .maxPointers(1)
    .onTouchesDown((event, manager) => {
      // At rest a drag belongs to the native screen dismissal, not to an immovable photo.
      if (scale.get() <= 1 || event.numberOfTouches > 1) {
        manager.fail();
      }
    })
    .onStart(() => {
      stopZoom();
      startX.set(x.get());
      startY.set(y.get());
    })
    .onUpdate((event) => {
      move(scale.get(), startX.get() + event.translationX, startY.get() + event.translationY);
    });
  const doubleTap = Gesture.Tap()
    .withTestId('picture-double-tap')
    .numberOfTaps(2)
    .onEnd((event, success) => {
      if (success) {
        stopZoom();
        if (scale.get() <= 1) {
          scheduleOnRN(hideControls);
        }
        resize(scale.get() > 1 ? 1 : 2, event.x - width.get() / 2, event.y - height.get() / 2);
      }
    });
  const tap = Gesture.Tap()
    .withTestId('picture-tap')
    .onEnd((event, success) => {
      if (success) {
        scheduleOnRN(toggleControls);
      }
    });
  const transform = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
  }));

  const content = (
    <GestureHandlerRootView style={styles.screen}>
      <StatusBar hidden={!controlsVisible} animated />
      <SafeAreaProvider>
        <View style={styles.fill} accessibilityViewIsModal onAccessibilityEscape={onClose}>
          <View
            style={styles.viewport}
            onLayout={(event) => {
              width.set(event.nativeEvent.layout.width);
              height.set(event.nativeEvent.layout.height);
              move(1, 0, 0);
            }}
          >
            <GestureDetector gesture={Gesture.Race(pinch, pan, Gesture.Exclusive(doubleTap, tap))}>
              <View style={styles.gestures} collapsable={false}>
                <Animated.View
                  style={[fitted, transform]}
                  accessible
                  accessibilityRole="image"
                  accessibilityLabel={label}
                  accessibilityHint={labels.hint}
                  accessibilityIgnoresInvertColors
                  onAccessibilityTap={toggleControls}
                  accessibilityActions={[
                    { name: 'enlarge', label: labels.enlarge },
                    { name: 'reduce', label: labels.reduce },
                    { name: 'controls', label: controlsVisible ? labels.hideControls : labels.showControls },
                    { name: 'close', label: labels.close },
                  ]}
                  onAccessibilityAction={(event) => {
                    switch (event.nativeEvent.actionName) {
                      case 'enlarge':
                        resize(scale.get() + 1);
                        break;
                      case 'reduce':
                        resize(scale.get() - 1);
                        break;
                      case 'controls':
                        toggleControls();
                        break;
                      case 'close':
                        onClose();
                        break;
                      default:
                        break;
                    }
                  }}
                >
                  {renderTarget(
                    <ExpoImage
                      source={source}
                      recyclingKey={recyclingKey}
                      placeholder={standingIn ?? (thumbhash === undefined ? null : { thumbhash })}
                      placeholderContentFit="contain"
                      contentFit="contain"
                      allowDownscaling={false}
                      style={styles.fill}
                      accessible={false}
                      onLoad={(event) => {
                        if (event.source.width > 0 && event.source.height > 0) {
                          ratio.set(event.source.width / event.source.height);
                          move(scale.get(), x.get(), y.get());
                        }
                      }}
                    />,
                  )}
                </Animated.View>
              </View>
            </GestureDetector>
          </View>
          {/* Overlays never participate in the photo's layout, even when text or safe areas change. */}
          <Animated.View
            style={[styles.overlay, chrome]}
            pointerEvents={controlsVisible ? 'box-none' : 'none'}
            accessibilityElementsHidden={!controlsVisible}
            importantForAccessibility={controlsVisible ? 'auto' : 'no-hide-descendants'}
          >
            <View style={styles.commands} pointerEvents="box-none">
              <SafeAreaView edges={['top', 'left', 'right']} pointerEvents="box-none">
                {controls}
              </SafeAreaView>
              {footer === null ? null : (
                <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.caption}>
                  {footer}
                </SafeAreaView>
              )}
            </View>
          </Animated.View>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
  return presentation === 'screen' ? (
    content
  ) : (
    <Modal visible presentationStyle="fullScreen" animationType="fade" onRequestClose={onClose}>
      {content}
    </Modal>
  );
}
