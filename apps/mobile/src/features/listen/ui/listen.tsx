import type { Article, DisplayText } from '@huma/contracts';
import { RADII, SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Button } from '#components/button';
import { t } from '#i18n';
import { DECORATIVE } from '#lib/announce';
import { createStyles, useTheme } from '#lib/styles';
import { AudioDock, AudioSheet } from '#primitives/audio-sheet';
import { Box } from '#primitives/box';
import { Icon } from '#primitives/icon';
import { ICONS } from '#primitives/icon';
import { Pressable } from '#primitives/pressable';
import { Progress } from '#primitives/progress';
import { Scroll } from '#primitives/scroll';
import { Scrubber } from '#primitives/scrubber';
import { Text } from '#primitives/text';
import { ThemeScope } from '#primitives/theme';
import type { Listening } from '../model/controller';
import { passagesOf } from '../model/passages';
import { listening, useListening } from '../model/store';

const useStyles = createStyles((theme) => ({
  invitation: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADII.lg,
    backgroundColor: theme.card,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  invitationWords: { flex: 1, gap: SPACING.xs },
  badge: {
    width: SPACING.xxxl,
    height: SPACING.xxxl,
    borderRadius: RADII.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
  },
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  iconButton: { width: SPACING.xxxl, height: SPACING.xxxl, alignItems: 'center', justifyContent: 'center' },
  body: { padding: SPACING.xl, gap: SPACING.xl, paddingBottom: SPACING.xxxl },
  cover: {
    backgroundColor: theme.card,
    borderRadius: RADII.lg,
    padding: SPACING.xl,
    gap: SPACING.xl,
    minHeight: SIZES.cover,
    justifyContent: 'space-between',
  },
  coverHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { gap: SPACING.md },
  voice: { gap: SPACING.xs },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', gap: SPACING.sm },
  play: {
    padding: SPACING.lg,
    borderRadius: RADII.pill,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeline: { gap: SPACING.xs },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  speed: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADII.pill,
    backgroundColor: theme.card,
    alignSelf: 'center',
  },
  transcript: { gap: SPACING.md, borderLeftWidth: SIZES.stroke, borderColor: theme.primary, paddingLeft: SPACING.lg },
  notice: { gap: SPACING.md },
  dock: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
    backgroundColor: theme.card,
  },
  dockWords: { flex: 1, gap: SPACING.xs },
}));

const time = (seconds: number): DisplayText =>
  t('listen.time', { minutes: Math.floor(seconds / 60), seconds: String(Math.floor(seconds % 60)).padStart(2, '0') });
function statusOf(state: Listening): DisplayText {
  switch (state.stage) {
    case 'idle':
    case 'intro':
      return t('listen.voice');
    case 'preparing':
      return t('listen.preparing');
    case 'playing':
      return t('listen.playing');
    case 'paused':
      return t('listen.paused');
    case 'ended':
      return t('listen.ended');
    case 'failed':
      return t('listen.retry');
  }
}
function Control({
  icon,
  label,
  onPress,
  main = false,
}: Readonly<{ icon: keyof typeof ICONS; label: DisplayText; onPress: () => void; main?: boolean }>): ReactNode {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Pressable role="button" label={label} onPress={onPress} style={main ? styles.play : styles.iconButton}>
      <Icon
        name={icon}
        size={main ? SPACING.xxl : SPACING.xl}
        tintColor={main ? theme.onPrimary : theme.textPrimary}
        announces={DECORATIVE}
      />
    </Pressable>
  );
}
function Play({ state, main = false }: Readonly<{ state: Listening; main?: boolean }>): ReactNode {
  const playing = state.stage === 'playing' || state.stage === 'preparing';
  return (
    <Control
      icon={playing ? 'pause' : 'play'}
      label={t(playing ? 'listen.pause' : state.stage === 'ended' ? 'listen.replay' : 'listen.play')}
      onPress={listening.toggle}
      main={main}
    />
  );
}

export function ListenArticle({ article }: Readonly<{ article: Article }>): ReactNode {
  const styles = useStyles();
  const theme = useTheme();
  const passages = useMemo(() => {
    try {
      return passagesOf(article);
    } catch {
      return [];
    }
  }, [article]);
  if (passages.length === 0 || !/^\d+$/u.test(article.id)) {
    return null;
  }
  return (
    <Pressable
      style={styles.invitation}
      role="button"
      label={t('listen.action')}
      onPress={() => {
        listening.select(article, passages);
      }}
    >
      <Box style={styles.badge}>
        <Icon name="headphones" tintColor={theme.onPrimary} announces={DECORATIVE} />
      </Box>
      <Box style={styles.invitationWords}>
        <Text variant="label">{t('listen.action')}</Text>
        <Text variant="caption" tone="textMuted">
          {t('listen.voice')}
        </Text>
      </Box>
      <Icon name="play" announces={DECORATIVE} />
    </Pressable>
  );
}

function Expanded({ state }: Readonly<{ state: Listening }>): ReactNode {
  const styles = useStyles();
  const article = state.article;
  if (article === null) {
    return null;
  }
  const introducing = state.stage === 'intro';
  const waiting = state.stage === 'preparing';
  const passage = state.passages[state.index];
  return (
    <AudioSheet
      onClose={() => {
        listening.expand(false);
      }}
    >
      <Box style={styles.header}>
        <Control
          icon="collapse"
          label={t('listen.collapse')}
          onPress={() => {
            listening.expand(false);
          }}
        />
        <Text variant="label">{t('listen.title')}</Text>
        <Control icon="clear" label={t('listen.close')} onPress={listening.stop} />
      </Box>
      <Scroll axis="vertical" contentStyle={styles.body}>
        <Box style={styles.cover}>
          <Box style={styles.coverHead}>
            <Text variant="kicker">{t('listen.eyebrow')}</Text>
            <Icon name="headphones" size={SPACING.xxl} announces={DECORATIVE} />
          </Box>
          <Box style={styles.title}>
            <Text variant="display" heading>
              {article.title}
            </Text>
            {article.byline === undefined ? null : (
              <Text variant="caption" tone="textSecondary">
                {article.byline}
              </Text>
            )}
          </Box>
          <Box style={styles.voice}>
            <Text variant="label">{t('listen.voice')}</Text>
            <Text variant="caption" tone="textMuted">
              {t('listen.remote')}
            </Text>
          </Box>
        </Box>
        {introducing ? (
          <Box style={styles.notice}>
            <Text variant="title" heading>
              {t('listen.intro.title')}
            </Text>
            <Text>{t('listen.intro.body')}</Text>
            <Button label={t('listen.intro.action')} onPress={listening.begin} />
          </Box>
        ) : (
          <>
            <Text variant="caption" tone="textSecondary" align="center" alert>
              {statusOf(state)}
            </Text>
            {waiting ? <Progress busy announces={DECORATIVE} /> : null}
            {state.stage === 'failed' ? (
              <Box style={styles.notice}>
                <Text>{t('listen.error.speech')}</Text>
                <Button label={t('listen.retry')} onPress={listening.begin} />
              </Box>
            ) : null}
            {
              <>
                <Box style={styles.timeline}>
                  <Scrubber
                    value={state.duration > 0 ? state.position / state.duration : 0}
                    label={t('listen.progress')}
                    step={0.01}
                    onChange={(fraction) => {
                      listening.seek(fraction * state.duration);
                    }}
                  />
                  <Box style={styles.between}>
                    <Text variant="caption" tone="textMuted">
                      {time(Math.min(state.position, state.duration))}
                    </Text>
                    <Text variant="caption" tone="textSecondary">
                      {t('listen.passage', { current: state.index + 1, total: state.passages.length })}
                    </Text>
                    <Text variant="caption" tone="textMuted">
                      {state.complete ? time(state.duration) : t('listen.generating')}
                    </Text>
                  </Box>
                </Box>
                <Box style={styles.controls}>
                  <Control
                    icon="previous"
                    label={t('listen.previous')}
                    onPress={() => {
                      listening.jump(state.index - 1);
                    }}
                  />
                  <Control
                    icon="backward"
                    label={t('listen.backward')}
                    onPress={() => {
                      listening.seek(state.position - 15);
                    }}
                  />
                  <Play state={state} main />
                  <Control
                    icon="forward"
                    label={t('listen.forward')}
                    onPress={() => {
                      listening.seek(state.position + 15);
                    }}
                  />
                  <Control
                    icon="following"
                    label={t('listen.next')}
                    onPress={() => {
                      listening.jump(state.index + 1);
                    }}
                  />
                </Box>
                <Pressable
                  style={styles.speed}
                  role="button"
                  label={t('listen.changeSpeed', { speed: state.speed })}
                  onPress={listening.speed}
                >
                  <Text variant="label">{t('listen.speed', { speed: String(state.speed).replace('.', ',') })}</Text>
                </Pressable>
                {passage === undefined ? null : (
                  <Box style={styles.transcript}>
                    <Text variant="kicker" tone="textMuted">
                      {t('listen.transcript')}
                    </Text>
                    <Text variant="prose">{t('listen.words', { words: passage.text })}</Text>
                  </Box>
                )}
              </>
            }
          </>
        )}
        <Text variant="caption" tone="textMuted" align="center">
          {t('listen.continue')}
        </Text>
        <Text variant="caption" tone="textMuted" align="center">
          {t('listen.about')}
        </Text>
      </Scroll>
    </AudioSheet>
  );
}

export function ListeningPlayer(): ReactNode {
  const state = useListening();
  const styles = useStyles();
  if (state.article === null) {
    return null;
  }
  return (
    <>
      <AudioDock hidden={state.expanded}>
        <Box style={styles.dock}>
          <Pressable
            role="button"
            label={t('listen.open')}
            onPress={() => {
              listening.expand(true);
            }}
            style={styles.dockWords}
          >
            <Text variant="caption" tone="textMuted">
              {statusOf(state)}
            </Text>
            <Text variant="label" numberOfLines={1}>
              {state.article.title}
            </Text>
          </Pressable>
          <Play state={state} />
          <Control icon="clear" label={t('listen.close')} onPress={listening.stop} />
        </Box>
      </AudioDock>
      {state.expanded ? (
        <ThemeScope name="dark" screen>
          <Expanded state={state} />
        </ThemeScope>
      ) : null}
    </>
  );
}
