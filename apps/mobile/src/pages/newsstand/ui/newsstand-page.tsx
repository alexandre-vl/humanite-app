import { SPACING } from '@huma/design-tokens';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { TopBar } from '#components/top-bar';
import { NEWSROOM } from '#config';
import { FeedStandIn, stateOf } from '#entities/article';
import { t } from '#i18n';
import { openExternal } from '#lib/routing';
import { createStyles } from '#lib/styles';
import { Pressable } from '#primitives/pressable';
import { Scroll } from '#primitives/scroll';
import { Surface } from '#primitives/surface';
import { Text } from '#primitives/text';
import { issuesQuery } from '../api/queries';
import { coverLabel } from '../model/count';
import { IssueCover } from './issue-cover';

const useStyles = createStyles(() => ({
  // The frame is given its height, not left to find one: a scrolling region inside a ground that fills the screen
  // sizes to its content otherwise, and a short page would leave the rest of the ground unreachable.
  frame: { flex: 1 },
  page: { padding: SPACING.lg, gap: SPACING.lg },
  shelf: { gap: SPACING.lg, paddingBottom: SPACING.sm },
}));

/**
 * The newsstand: every numéro of the paper, standing on a shelf that scrolls across.
 *
 * It stands one publication and not the three the current app's kiosk does. Nothing in this paper distinguishes a
 * magazine or a hors-série from the daily — no field says so and no item belongs to one — so shelving three would be
 * shelving an editorial decision the fiction never made, and every cover on two of the shelves would be a lie about
 * what opening it gives you. What the paper does distinguish, it already says: each item carries the hour it was filed
 * at, and a numéro of a daily is its day.
 *
 * The shelf scrolls across rather than down. A screen owes its vertical scroll to a single region, and the band the
 * covers stand in takes the other axis — which is also how the screen this copies stands them, cut at the edge with
 * no rail, so that a reader can see there is more without being told.
 *
 * Taking a numéro off the shelf opens the paper on the web, and the line under the title says so before a finger
 * moves. The app used to push a sommaire of its own — the day's articles, every one of them dressed as a headline —
 * which was a third feed of the same cards the front page and the wire already lay out, and the one screen in the
 * app that answered a question nobody had asked. A kiosk sells the paper; it does not reprint it.
 *
 * And a kiosk is not a tab. Every press on this screen ends in a browser, so it held a fifth of the app's own
 * navigation to lead out of it, while what the reader keeps was two presses behind a menu. It is pushed from the
 * account now, where the paper's own business — what it costs, how to reach it — is, and it carries the way back a
 * pushed screen owes.
 */
export function NewsstandPage(): ReactNode {
  const styles = useStyles();
  const { data, status, error, refetch } = useQuery(issuesQuery);
  const issues = data ?? [];
  return (
    <Surface>
      <TopBar
        title={t('nav.newsstand')}
        onBack={() => {
          router.back();
        }}
      />
      <Scroll axis="vertical" style={styles.frame} contentStyle={styles.page}>
        {/* Said once, above the shelf, and not on every cover: a reader leaving the app should read it coming, and
            four covers repeating the same sentence would be the shelf telling them four times. */}
        <Text variant="caption">{t('newsstand.web')}</Text>
        {issues.length === 0 ? (
          // While the shelf is on its way, and when it failed, the stand-in says so: an empty shelf is the one thing
          // it would be wrong to say before the answer is in.
          <FeedStandIn
            state={stateOf(status, error)}
            onRetry={() => {
              void refetch();
            }}
            empty={{ title: t('newsstand.empty.title'), message: t('newsstand.empty.message') }}
          />
        ) : (
          <Scroll axis="horizontal" contentStyle={styles.shelf}>
            {issues.map((issue) => (
              <Pressable
                key={issue.id}
                label={coverLabel(issue)}
                role="link"
                onPress={() => {
                  openExternal(NEWSROOM.site);
                }}
              >
                <IssueCover issue={issue} />
              </Pressable>
            ))}
          </Scroll>
        )}
      </Scroll>
    </Surface>
  );
}
