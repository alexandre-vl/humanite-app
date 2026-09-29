import { create } from 'zustand';
import type { ArticleFigureProps } from '#entities/article';

/** Transient selection: the native route receives the already loaded photograph, including offline assets. */
export const useViewingPicture = create<
  Readonly<{
    picture: ArticleFigureProps | null;
    open: (picture: ArticleFigureProps) => void;
    clear: () => void;
  }>
>((set) => ({
  picture: null,
  open: (picture) => {
    set({ picture });
  },
  clear: () => {
    set({ picture: null });
  },
}));
