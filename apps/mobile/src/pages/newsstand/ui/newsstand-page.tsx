import { SPACING } from '@huma/design-tokens';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { EmptyState } from '#components/empty-state';
import { IssueCover, issuesQuery } from '#entities/issue';
import { t } from '#i18n';
import { issueHref } from '#lib/routing';
import { createStyles } from '#lib/styles';
import { Pressable } from '#primitives/pressable';
import { Scroll } from '#primitives/scroll';
import { Surface } from '#primitives/surface';
import { Text } from '#primitives/text';

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
 */
export function NewsstandPage(): ReactNode {
  const styles = useStyles();
  const issues = useQuery(issuesQuery).data ?? [];
  return (
    <Surface>
      <Scroll axis="vertical" style={styles.frame} contentStyle={styles.page}>
        <Text variant="display">{t('nav.newsstand')}</Text>
        {issues.length === 0 ? (
          <EmptyState title={t('newsstand.empty.title')} message={t('newsstand.empty.message')} />
        ) : (
          <Scroll axis="horizontal" contentStyle={styles.shelf}>
            {issues.map((issue) => (
              <Pressable
                key={issue.id}
                onPress={() => {
                  router.push(issueHref(issue.id));
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
