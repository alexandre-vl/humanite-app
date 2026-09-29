/** The photograph stays between its fitted size and four times that size. */
const MAX_ZOOM = 4;

export const boundedScale = (scale: number): number => {
  'worklet';
  return Math.min(MAX_ZOOM, Math.max(1, scale));
};

/** Keep the photograph's edges inside the viewport; a smaller axis remains centred. */
export const boundedOffset = (offset: number, picture: number, viewport: number, scale: number): number => {
  'worklet';
  const limit = Math.max(0, (picture * scale - viewport) / 2);
  return limit === 0 ? 0 : Math.min(limit, Math.max(-limit, offset));
};

/** Preserve the point beneath the fingers as the magnification changes. */
export const scaledOffset = (offset: number, focus: number, before: number, after: number): number => {
  'worklet';
  return focus - (focus - offset) * (after / before);
};
