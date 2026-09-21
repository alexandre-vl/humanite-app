import type { DisplayText } from '@huma/contracts';
import { RADII, SIZES, SPACING } from '@huma/design-tokens';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { t } from '#i18n';
import { DECORATIVE } from '#lib/announce';
import { NEWSSTAND_HREF, SETTINGS_HREF } from '#lib/routing';
import { createStyles, useTheme } from '#lib/styles';
import { Box } from '#primitives/box';
import { Icon } from '#primitives/icon';
import { Pressable } from '#primitives/pressable';
import { Scroll } from '#primitives/scroll';
import { Surface } from '#primitives/surface';
import { Text } from '#primitives/text';

const useStyles = createStyles((theme) => ({
  // The frame is given its height, not left to find one: a scrolling region inside a ground that fills the
  // screen sizes to its content otherwise, and a short page would leave the rest of the ground unreachable.
  frame: { flex: 1 },
  page: { padding: SPACING.lg, gap: SPACING.xl },
  group: { gap: SPACING.sm },
  // The rules between rows are the ground showing through: a card whose rows are spaced by the width of a rule, over
  // the colour a rule is drawn in, needs no rule of its own.
  card: {
    gap: SIZES.stroke,
    backgroundColor: theme.border,
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
 * It holds what this app actually has, and nothing else. There is no account to sign into, nothing to buy and no
 * library to open, so the screen does not draw rows that would lead nowhere — the current one lists eight, five of
 * which cannot mean anything here, and puts deleting an account in the same type as everything around it. What is
 * left is true: where the reader sets how the paper is printed for them, where the numéros stand, and how to reach
 * the newsroom, which the current app only shows once one is signed out.
 *
 * What the reader kept is no longer a row here. It was, and it was also a mark on the front page's masthead, because
 * it was in the bar at the bottom nowhere — which made this screen the only way to it from the wire, the search and
 * the newsstand. It has a tab of its own now, so a row leading to the destination beside this one would be a third
 * door to one room.
 */
export function AccountPage(): ReactNode {
  const styles = useStyles();
  return (
    <Surface>
      <Scroll axis="vertical" style={styles.frame} contentStyle={styles.page}>
        <Text variant="display" heading>
          {t('nav.account')}
        </Text>
        <Group label={t('account.reading')}>
          <OpenRow
            label={t('settings.title')}
            onPress={() => {
              router.push(SETTINGS_HREF);
            }}
          />
        </Group>
        {/* The shelf of numéros, which was a tab and is a row. Every press on it ends in a browser, so it belongs
            where the rest of the paper's own business is rather than in the bar a reader navigates the app by. */}
        <Group label={t('account.paper')}>
          <OpenRow
            label={t('nav.newsstand')}
            onPress={() => {
              router.push(NEWSSTAND_HREF);
            }}
          />
        </Group>
        <Group label={t('account.contact')}>
          <InfoRow line={t('account.contact.mail')} hint={t('account.contact.mail.hint')} />
          <InfoRow line={t('account.contact.phone')} hint={t('account.contact.phone.hint')} />
        </Group>
      </Scroll>
    </Surface>
  );
}
