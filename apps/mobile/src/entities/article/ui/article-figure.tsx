import type { DisplayText } from '@huma/contracts';
import { PALETTE, RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { createContext, use, useState } from 'react';
import type { Visual } from '#api';
import { t } from '#i18n';
import { DECORATIVE } from '#lib/announce';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Icon } from '#primitives/icon';
import { Image, ImageViewer } from '#primitives/image';
import { Pressable } from '#primitives/pressable';
import { ThemeScope } from '#primitives/theme';
import { Text } from '#primitives/text';
import type { Frame } from '../model/picture';
import { FRAMES } from '../model/picture';

export type ArticleFigureProps = Readonly<{
  visual: Visual;
  /** The frame the picture is cut to, which is what the picture is: a photograph, or the still of a film. */
  frame: Frame;
  recyclingKey: string;
  caption?: DisplayText | undefined;
  credit?: DisplayText | undefined;
  aspectRatio?: number | undefined;
}>;

export type FigureLinkProps = Readonly<{ figure: ArticleFigureProps; children: ReactNode }>;

/** The page supplies navigation; isolated figures retain their local viewer. */
export const FigureLinkContext = createContext<((props: FigureLinkProps) => ReactNode) | null>(null);

const useStyles = createStyles((theme) => ({
  figure: { gap: SPACING.sm },
  photo: { alignSelf: 'stretch', aspectRatio: FRAMES.photo, backgroundColor: theme.standIn },
  film: { alignSelf: 'stretch', aspectRatio: FRAMES.film, backgroundColor: theme.standIn },
  words: { gap: SPACING.xs, paddingHorizontal: SPACING.lg },
  controls: { alignItems: 'flex-end', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  close: {
    width: SPACING.xxxl,
    height: SPACING.xxxl,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PALETTE.darkSurface,
  },
  caption: { padding: SPACING.xl, gap: SPACING.sm, backgroundColor: PALETTE.black },
}));

/**
 * A picture inside an article, with what is written under it. The picture runs edge to edge while the words keep the
 * column's margins, which is how the current app sets them: only the words are read, so only they need a measure.
 *
 * The journal leaves both words out often enough — a quarter of its pictures come with no caption, and its credit is
 * whatever it wrote into one — that neither is assumed. With neither, nothing is laid under the picture at all, not even
 * the space the words would have taken.
 */
export function ArticleFigure({
  visual,
  frame,
  recyclingKey,
  caption,
  credit,
  aspectRatio: knownRatio,
}: ArticleFigureProps): ReactNode {
  const styles = useStyles();
  const link = use(FigureLinkContext);
  const [aspectRatio, setAspectRatio] = useState(knownRatio ?? FRAMES[frame]);
  const [opened, setOpened] = useState(false);
  const close = (): void => {
    setOpened(false);
  };
  const picture = (
    <Image
      source={visual.source}
      recyclingKey={recyclingKey}
      announces={DECORATIVE}
      thumbhash={visual.thumbhash}
      standingIn={visual.standingIn}
      style={styles[frame]}
      onAspectRatio={setAspectRatio}
    />
  );
  const thumbnail = (
    <Pressable
      role="button"
      label={t('picture.open')}
      onPress={
        link === null
          ? () => {
              setOpened(true);
            }
          : undefined
      }
    >
      {picture}
    </Pressable>
  );
  return (
    <Box style={styles.figure}>
      {link === null
        ? thumbnail
        : link({ figure: { visual, frame, recyclingKey, caption, credit, aspectRatio }, children: picture })}
      {opened ? <ArticlePicture figure={{ visual, frame, recyclingKey, caption, credit }} onClose={close} /> : null}
      {caption === undefined && credit === undefined ? null : (
        <Box style={styles.words}>
          {caption === undefined ? null : <Text variant="legend">{caption}</Text>}
          {/* Quieter than the caption it follows. The two were set in the very same type, so a sentence describing a
              picture and the name of whoever took it read as one paragraph of two sentences. */}
          {credit === undefined ? null : (
            <Text variant="legend" tone="textMuted">
              {credit}
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}

/** Shared image and captions, presented by either the native stack or an isolated modal. */
export function ArticlePicture({
  figure: { visual, recyclingKey, caption, credit, aspectRatio },
  onClose: close,
  presentation = 'modal',
  renderTarget,
  onZoomChange,
}: Readonly<{
  figure: ArticleFigureProps;
  onClose: () => void;
  presentation?: 'modal' | 'screen';
  renderTarget?: ((picture: ReactNode) => ReactNode) | undefined;
  onZoomChange?: ((zoomed: boolean) => void) | undefined;
}>): ReactNode {
  const styles = useStyles();
  return (
    <ThemeScope name="dark" screen>
      <ImageViewer
        source={visual.source}
        recyclingKey={recyclingKey}
        thumbhash={visual.thumbhash}
        standingIn={visual.standingIn}
        label={caption ?? t('picture.label')}
        labels={{
          hint: t('picture.hint'),
          enlarge: t('picture.enlarge'),
          reduce: t('picture.reduce'),
          showControls: t('picture.showControls'),
          hideControls: t('picture.hideControls'),
          close: t('picture.close'),
        }}
        onClose={close}
        initialRatio={aspectRatio}
        presentation={presentation}
        renderTarget={renderTarget}
        onZoomChange={onZoomChange}
        controls={
          <Box style={styles.controls}>
            <Pressable role="button" label={t('picture.close')} style={styles.close} onPress={close}>
              <Icon name="close" announces={DECORATIVE} size={SPACING.lg} />
            </Pressable>
          </Box>
        }
        footer={
          caption === undefined && credit === undefined ? null : (
            <Box style={styles.caption}>
              {caption === undefined ? null : (
                <Text variant="legend" numberOfLines={3}>
                  {caption}
                </Text>
              )}
              {credit === undefined ? null : (
                <Text variant="caption" tone="textMuted" numberOfLines={2}>
                  {credit}
                </Text>
              )}
            </Box>
          )
        }
      />
    </ThemeScope>
  );
}
