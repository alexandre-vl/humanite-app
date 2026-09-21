import { SPACING } from '@huma/design-tokens';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { EmptyState } from '#components/empty-state';
import { NEWSROOM } from '#config';
import { t } from '#i18n';
import { openExternal } from '#lib/routing';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
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
  // The title and the sentence under it are one thing said, so they are set closer to each other than to the shelf.
  masthead: { gap: SPACING.xs },
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
 */
export function NewsstandPage(): ReactNode {
  const styles = useStyles();
  const issues = useQuery(issuesQuery).data ?? [];
  return (
    <Surface>
      <Scroll axis="vertical" style={styles.frame} contentStyle={styles.page}>
        <Box style={styles.masthead}>
          <Text variant="display" heading>
            {t('nav.newsstand')}
          </Text>
          {/* Said once, above the shelf, and not on every cover: a reader leaving the app should read it coming, and
              four covers repeating the same sentence would be the shelf telling them four times. */}
          <Text variant="caption">{t('newsstand.web')}</Text>
        </Box>
        {issues.length === 0 ? (
          <EmptyState title={t('newsstand.empty.title')} message={t('newsstand.empty.message')} />
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
