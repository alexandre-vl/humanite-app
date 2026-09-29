import { Link, Redirect, router, usePreventZoomTransitionDismissal } from 'expo-router';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ArticlePicture } from '#entities/article';
import { useViewingPicture } from '#features/view-picture';

const target = (picture: ReactNode): ReactNode => <Link.AppleZoomTarget>{picture}</Link.AppleZoomTarget>;

export function PicturePage(): ReactNode {
  const picture = useViewingPicture((state) => state.picture);
  const clear = useViewingPicture((state) => state.clear);
  const [zoomed, setZoomed] = useState(false);
  // The installed router only blocks gestures when explicit bounds are supplied.
  usePreventZoomTransitionDismissal(zoomed ? { unstable_dismissalBoundsRect: { maxX: 0, maxY: 0 } } : undefined);
  useEffect(() => clear, [clear]);
  if (picture === null) {
    return <Redirect href="/" />;
  }
  return (
    <ArticlePicture
      figure={picture}
      presentation="screen"
      renderTarget={target}
      onZoomChange={setZoomed}
      onClose={() => {
        router.back();
      }}
    />
  );
}
