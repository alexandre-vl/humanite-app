import type { DisplayText } from '@huma/contracts';
import { RADII, SIZES, SPACING } from '@huma/design-tokens';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { hasShelf, useSetAsideCount } from '#api';
import { useReaderSession } from '#features/sign-in';
import { t } from '#i18n';
import { DECORATIVE } from '#lib/announce';
import { NEWSSTAND_HREF, SETTINGS_HREF, SIGN_IN_HREF } from '#lib/routing';
import { createStyles, useTheme } from '#lib/styles';
import { Box } from '#primitives/box';
import { Icon } from '#primitives/icon';
import { Pressable } from '#primitives/pressable';
import { Scroll } from '#primitives/scroll';
import { Surface } from '#primitives/surface';
import { Text } from '#primitives/text';
import { setAsideLabel } from '../model/set-aside';

const useStyles = createStyles((theme) => ({
  page: { padding: SPACING.lg, gap: SPACING.xl },
  group: { gap: SPACING.sm },
  // The rules between rows are the ground showing through: a card whose rows are spaced by the width of a rule, over
  // the colour a rule is drawn in, needs no rule of its own.
  card: {
    gap: SIZES.stroke,
    backgroundColor: theme.rule,
    borderRadius: RADII.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: theme.card,
  },
  words: { flex: 1, gap: SPACING.xs },
}));

type RowProps = Readonly<{ line: DisplayText; hint: DisplayText }>;

/** A row that says something and goes nowhere: the paper's own address, which the app has no way to dial. */
function InfoRow({ line, hint }: RowProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.row}>
      <Box style={styles.words}>
        <Text variant="body">{line}</Text>
        <Text variant="caption">{hint}</Text>
      </Box>
    </Box>
  );
}

/** A row that opens another screen, and carries the mark that says so. */
function OpenRow({ label, onPress }: Readonly<{ label: DisplayText; onPress: () => void }>): ReactNode {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Pressable style={styles.row} onPress={onPress} role="link">
      <Box style={styles.words}>
        <Text variant="body">{label}</Text>
      </Box>
      <Icon name="next" announces={DECORATIVE} size={SPACING.md} tintColor={theme.textMuted} />
    </Pressable>
  );
}

/** A row that does something here rather than opening a screen, and so carries no mark that one opens. */
function ActionRow({ label, onPress }: Readonly<{ label: DisplayText; onPress: () => void }>): ReactNode {
  const styles = useStyles();
  return (
    <Pressable style={styles.row} onPress={onPress} role="button">
      <Box style={styles.words}>
        <Text variant="body">{label}</Text>
      </Box>
    </Pressable>
  );
}

/**
 * Where the reader stands with their subscription, and the one thing to do about it.
 *
 * A build that was not given the journal's key can open no connection at all, so it draws nothing here rather than a
 * row that would refuse — ADR-0032 keeps that key out of anything published, and a button leading to a refusal is
 * the same broken promise as a button leading nowhere.
 */
function Subscription(): ReactNode {
  const { offered, connection, signOut } = useReaderSession();
  if (!offered) {
    return null;
  }
  return (
    <Group label={t('account.subscription')}>
      {connection === 'in' ? (
        <ActionRow label={t('signIn.out')} onPress={signOut} />
      ) : (
        <OpenRow
          label={t('signIn.title')}
          onPress={() => {
            router.push(SIGN_IN_HREF);
          }}
        />
      )}
    </Group>
  );
}

/** A group of rows under a heading, as the current app lays its own out. */
function Group({ label, children }: Readonly<{ label: DisplayText; children: ReactNode }>): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.group}>
      <Text variant="label" align="center" heading>
        {label}
      </Text>
      <Box style={styles.card}>{children}</Box>
    </Box>
  );
}

/**
 * The reader's own corner of the paper.
 *
 * It holds what this app actually has, and nothing else. There is nothing to buy and no library to open, so the
 * screen does not draw rows that would lead nowhere — the current one lists eight, four of which cannot mean anything
 * here, and puts deleting an account in the same type as everything around it. What is left is true: where a
 * subscriber signs in, where the reader sets how the paper is printed for them, where the numéros stand, and how to
 * reach the newsroom, which the current app only shows once one is signed out.
 *
 * What the reader kept is no longer a row here. It was, and it was also a mark on the front page's masthead, because
 * it was in the bar at the bottom nowhere — which made this screen the only way to it from the wire, the search and
 * the newsstand. It has a tab of its own now, so a row leading to the destination beside this one would be a third
 * door to one room.
 */
export function AccountPage(): ReactNode {
  const styles = useStyles();
  const setAside = useSetAsideCount();
  return (
    <Surface>
      <Scroll axis="vertical" contentStyle={styles.page}>
        <Text variant="display" heading>
          {t('nav.account')}
        </Text>
        <Subscription />
        <Group label={t('account.reading')}>
          <OpenRow
            label={t('settings.title')}
            onPress={() => {
              router.push(SETTINGS_HREF);
            }}
          />
        </Group>
        {/* The shelf of numéros is a row and not a tab: every press on it ends in a browser, so it belongs where the
            rest of the paper's own business is. A source that shelves no numéros has no row to show. What the
            service sent that the app could not read is said here too, and only once there is something to say: a
            list that lost items to a shape the app does not know loses them without failing, and this is where that
            is seen. */}
        {hasShelf || setAside > 0 ? (
          <Group label={t('account.paper')}>
            {hasShelf ? (
              <OpenRow
                label={t('nav.newsstand')}
                onPress={() => {
                  router.push(NEWSSTAND_HREF);
                }}
              />
            ) : null}
            {setAside > 0 ? <InfoRow line={setAsideLabel(setAside)} hint={t('account.setAside.hint')} /> : null}
          </Group>
        ) : null}
        <Group label={t('account.contact')}>
          <InfoRow line={t('account.contact.mail')} hint={t('account.contact.mail.hint')} />
          <InfoRow line={t('account.contact.phone')} hint={t('account.contact.phone.hint')} />
        </Group>
      </Scroll>
    </Surface>
  );
}
