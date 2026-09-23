import type { DisplayText } from '@huma/contracts';
import type { FaceSet, TextScale, ThemeChoice } from '@huma/design-tokens';
import { RADII, SPACING, TEXT_SCALES, THEME_CHOICES } from '@huma/design-tokens';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Button } from '#components/button';
import { TopBar } from '#components/top-bar';
import type { SegmentedItem } from '#components/segmented-control';
import { SegmentedControl } from '#components/segmented-control';
import { usePreferences } from '#features/preferences';
import { t } from '#i18n';
import { createStyles, PAPER_TYPESETTING } from '#lib/styles';
import { Box } from '#primitives/box';
import { Scroll } from '#primitives/scroll';
import { Surface } from '#primitives/surface';
import { Switch } from '#primitives/switch';
import { Text } from '#primitives/text';

/**
 * The word each choice is offered under, and the choices themselves read off the tokens rather than listed again here.
 *
 * Written as a row of items, this screen could offer three of four steps and nothing would say so: the type held each
 * `id` to the union and never held the list to it. A table keyed by the union cannot miss one, and a list built from
 * the tokens' own cannot offer one the paper does not have, nor put them in an order the tokens do not.
 */
const APPEARANCE_WORDS = {
  system: t('settings.appearance.system'),
  light: t('settings.appearance.light'),
  dark: t('settings.appearance.dark'),
} as const satisfies Readonly<Record<ThemeChoice, DisplayText>>;

const APPEARANCES: readonly SegmentedItem<ThemeChoice>[] = THEME_CHOICES.map((id) => ({
  id,
  label: APPEARANCE_WORDS[id],
}));

const STEP_WORDS = {
  small: t('settings.size.small'),
  normal: t('settings.size.normal'),
  large: t('settings.size.large'),
  huge: t('settings.size.huge'),
} as const satisfies Readonly<Record<TextScale, DisplayText>>;

const STEPS: readonly SegmentedItem<TextScale>[] = TEXT_SCALES.map((id) => ({ id, label: STEP_WORDS[id] }));

/** Which set of faces the switch stands for, read and written as an on-off: off is the paper's own. */
const LEGIBLE: FaceSet = 'legible';

const useStyles = createStyles((theme) => ({
  page: { padding: SPACING.lg, gap: SPACING.xl },
  setting: { gap: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.lg },
  words: { flex: 1, gap: SPACING.xs },
  preview: {
    gap: SPACING.sm,
    padding: SPACING.lg,
    borderRadius: RADII.md,
    backgroundColor: theme.card,
  },
  reset: { alignItems: 'flex-start' },
}));

type SettingProps = Readonly<{ label: DisplayText; children: ReactNode }>;

/** One setting: what it is called, and the control that sets it. */
function Setting({ label, children }: SettingProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.setting}>
      <Text variant="label" heading>
        {label}
      </Text>
      {children}
    </Box>
  );
}

/**
 * How the reader wants the paper printed for them.
 *
 * Every control writes straight to the store, and the store reaches the whole app, so the screen shows what it sets as
 * it sets it: the colours turn under the finger, the type grows, and the sample below is an article's own prose at the
 * size and in the face an article will use. The app the reader is looking at is the preview — the current one shows
 * none at all, and prints a figure in pixels instead.
 */
export function SettingsPage(): ReactNode {
  const styles = useStyles();
  const theme = usePreferences((settings) => settings.theme);
  const scale = usePreferences((settings) => settings.scale);
  const faces = usePreferences((settings) => settings.faces);
  const chooseTheme = usePreferences((settings) => settings.chooseTheme);
  const chooseScale = usePreferences((settings) => settings.chooseScale);
  const chooseFaces = usePreferences((settings) => settings.chooseFaces);
  const reset = usePreferences((settings) => settings.reset);
  return (
    <Surface>
      <TopBar
        title={t('settings.title')}
        onBack={() => {
          router.back();
        }}
      />
      <Scroll axis="vertical" contentStyle={styles.page}>
        <Setting label={t('settings.appearance')}>
          <SegmentedControl items={APPEARANCES} active={theme} onSelect={chooseTheme} />
        </Setting>
        <Setting label={t('settings.size')}>
          <SegmentedControl items={STEPS} active={scale} onSelect={chooseScale} />
        </Setting>
        <Box style={styles.row}>
          <Box style={styles.words}>
            <Text variant="label">{t('settings.faces')}</Text>
            <Text variant="caption">{t('settings.faces.hint')}</Text>
          </Box>
          <Switch
            value={faces === LEGIBLE}
            label={t('settings.faces')}
            onChange={(wanted) => {
              chooseFaces(wanted ? LEGIBLE : PAPER_TYPESETTING.faces);
            }}
          />
        </Box>
        <Box style={styles.preview}>
          <Text variant="caption">{t('settings.preview')}</Text>
          <Text variant="prose">{t('settings.preview.text')}</Text>
        </Box>
        {/* Offered even when nothing is set, where pressing it sets what is already set. Hidden then, it would vanish
            from under the finger that pressed it and take a screen reader's place with it; greyed, it would need a
            state no other control of the app has. */}
        <Box style={styles.reset}>
          <Button label={t('settings.reset')} onPress={reset} />
        </Box>
      </Scroll>
    </Surface>
  );
}
