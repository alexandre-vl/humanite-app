import type { DisplayText } from '@huma/contracts';
import { RADII, SIZES, SPACING } from '@huma/design-tokens';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { hasShelf, useSetAsideCount } from '#api';
import { NEWSROOM } from '#config';
import { useAlertsSetting } from '#features/alerts';
import { useReaderSession } from '#features/sign-in';
import { t } from '#i18n';
import { DECORATIVE } from '#lib/announce';
import { NEWSSTAND_HREF, openAppSettings, openExternal, SETTINGS_HREF, SIGN_IN_HREF } from '#lib/routing';
import { createStyles, useTheme } from '#lib/styles';
import { Box } from '#primitives/box';
import { Icon } from '#primitives/icon';
import { Pressable } from '#primitives/pressable';
import { Scroll } from '#primitives/scroll';
import { Surface } from '#primitives/surface';
import { Switch } from '#primitives/switch';
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

/** A row that says something and goes nowhere: what the service sent that the app could not read, a connection open. */
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

/**
 * A row that hands the reader to what the phone does with it: the newsroom's address opened in their mail, its number
 * carried to their dialler.
 *
 * It was printed and nothing more — the two ways to reach the paper, set out to be copied out by hand, which on a
 * phone means typed again somewhere else. They keep the shape they had, the thing itself over what it is, and say
 * that they lead somewhere in the colour the paper gives what one may press, as the row that signs a reader out does.
 * No mark at the end: a chevron on this card means a screen of the app opens, and neither of these opens one.
 */
function ReachRow({ line, hint, url }: RowProps & Readonly<{ url: string }>): ReactNode {
  const styles = useStyles();
  return (
    <Pressable
      style={styles.row}
      role="link"
      onPress={() => {
        openExternal(url);
      }}
    >
      <Box style={styles.words}>
        <Text variant="body" tone="link">
          {line}
        </Text>
        <Text variant="caption">{hint}</Text>
      </Box>
    </Pressable>
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

/**
 * A row that does something here rather than opening a screen.
 *
 * It carries no mark, a mark on this card meaning a screen opens, and it would be indistinguishable from the rows
 * that answer nothing — the newsroom's address sits two groups below in the same type, on the same card — so the
 * words are set in the colour the paper gives the things one may press. That is the whole of what tells a reader it
 * is a control: a row that looks inert and is not is the same broken promise as a button that leads nowhere.
 */
function ActionRow({ label, onPress }: Readonly<{ label: DisplayText; onPress: () => void }>): ReactNode {
  const styles = useStyles();
  return (
    <Pressable style={styles.row} onPress={onPress} role="button">
      <Box style={styles.words}>
        <Text variant="body" tone="link">
          {label}
        </Text>
      </Box>
    </Pressable>
  );
}

/**
 * The journal's alerts: a switch, what turning it on sends and to whom, and a way out to the phone's settings when the
 * phone will not let the app show them.
 *
 * A build that cannot receive them draws nothing here, as a build that cannot open a connection draws no subscription
 * (ADR-0043). What the switch does is said under it rather than behind a link: it is the one control of the app that
 * signs the phone up with someone other than the journal's service. When the phone refuses, the refusal takes that
 * place, and the row under it is the only door that can change the answer — the platform asks a reader once, and
 * after that only its settings screen does.
 */
function Alerts(): ReactNode {
  const styles = useStyles();
  const { offered, on, blocked, choose } = useAlertsSetting();
  if (!offered) {
    return null;
  }
  return (
    <>
      <Box style={styles.row}>
        <Box style={styles.words}>
          <Text variant="body">{t('alerts.label')}</Text>
          <Text variant="caption">{blocked ? t('alerts.blocked') : t('alerts.hint')}</Text>
        </Box>
        <Switch value={on} label={t('alerts.label')} onChange={choose} />
      </Box>
      {blocked ? <ActionRow label={t('alerts.settings')} onPress={openAppSettings} /> : null}
    </>
  );
}

/**
 * Where the reader stands with their subscription, and the one thing to do about it.
 *
 * A build that reads the simulated corpus opens no connection at all, so it draws nothing here rather than a row that
 * would refuse: a button leading to a refusal is the same broken promise as a button leading nowhere. Every build
 * that reads the service carries what it takes to open one and offers it (ADR-0040).
 */
function Subscription(): ReactNode {
  const { offered, connection, signOut } = useReaderSession();
  if (!offered) {
    return null;
  }
  return (
    <Group label={t('account.subscription')}>
      {connection === 'in' ? (
        <>
          <InfoRow line={t('signIn.done')} hint={t('signIn.done.hint')} />
          <ActionRow label={t('signIn.out')} onPress={signOut} />
        </>
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

/**
 * A group of rows on one card under a heading, as the current app lays its own out.
 *
 * The heading starts from the edge the screen's name and every row start from, as the reading settings set theirs.
 * The current app centred it, under a paper's name that was centred too; here the screen names itself at that edge,
 * and a centred heading was the one thing on the screen that did not start from it (iPhone simulator, 25/09/2026).
 */
function Group({ label, children }: Readonly<{ label: DisplayText; children: ReactNode }>): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.group}>
      <Text variant="label" heading>
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
          {t('account.title')}
        </Text>
        <Subscription />
        <Group label={t('account.reading')}>
          <OpenRow
            label={t('settings.title')}
            onPress={() => {
              router.push(SETTINGS_HREF);
            }}
          />
          <Alerts />
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
          <ReachRow line={t('account.contact.mail')} hint={t('account.contact.mail.hint')} url={NEWSROOM.mail} />
          <ReachRow line={t('account.contact.phone')} hint={t('account.contact.phone.hint')} url={NEWSROOM.phone} />
        </Group>
        {/* Said to the reader, and not only to the service in the name this app calls itself by: the screen where
            one signs in with a subscription is the screen where mistaking this app for the journal's own would cost
            something. In the smallest type of the paper, at the foot, where a colophon goes — it is a fact to have
            read once, not a warning to be met with every time. */}
        <Text variant="caption">{t('account.unofficial')}</Text>
      </Scroll>
    </Surface>
  );
}
