import type { ContentErrorCode, DisplayText, Instant, IssueId } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { canRetry } from '#api';
import { Button } from '#components/button';
import { EmptyState } from '#components/empty-state';
import { t } from '#i18n';
import { DECORATIVE } from '#lib/announce';
import { daysAgo, formatDayInText, useToday } from '#lib/format';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Progress } from '#primitives/progress';
import { Text } from '#primitives/text';
import type { FeedFoot } from '../model/paged-feed';
import { failureWords } from './feed-stand-in';

export type FeedFooterProps = Readonly<{
  foot: FeedFoot;
  /** Asking for the next part again, once asking failed. */
  onRetry: () => void;
}>;

const useStyles = createStyles(() => ({
  coming: { gap: SPACING.sm },
  failed: { gap: SPACING.md },
  retry: { alignItems: 'center' },
  // Set in from the edges as the cards above it are, and as far under the last of them as they stand apart.
  under: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg },
}));

/**
 * What the foot says is on its way, against the day the reader is reading on: the rest of today, yesterday, or a day
 * by its date — named as the heads of the wire name them, so the foot never calls « jeudi 24 » what the head above
 * it calls « Hier ».
 */
const comingWords = (day: Instant | null, today: IssueId): DisplayText => {
  if (day === null) {
    return t('feed.more');
  }
  const before = daysAgo(day, today);
  if (before <= 0) {
    return t('feed.more.today');
  }
  return before === 1 ? t('feed.more.yesterday') : t('feed.more.day', { day: formatDayInText(day) });
};

/**
 * The next part of a feed on its way: what is coming — the day, on a feed read a day at a time — over the rule the app
 * draws for a wait nobody can measure. The words carry it: the rule is there for the eye, and a reader listening hears
 * the day.
 */
export function FootComing({ day }: Readonly<{ day: Instant | null }>): ReactNode {
  const styles = useStyles();
  const today = useToday();
  return (
    <Box style={styles.coming}>
      <Text variant="caption">{comingWords(day, today)}</Text>
      <Progress busy announces={DECORATIVE} />
    </Box>
  );
}

/**
 * The next part of a feed that did not come: said by its cause, as a feed that holds nothing says it, and offered
 * another try when one could answer differently. The items above stay: what failed is the part below them, and
 * nothing a reader has read is taken back.
 */
export function FootFailed({
  failure,
  onRetry,
}: Readonly<{ failure: ContentErrorCode; onRetry: () => void }>): ReactNode {
  const styles = useStyles();
  const words = failureWords(failure);
  return (
    <Box style={styles.failed}>
      <EmptyState title={words.title} message={words.message} />
      {canRetry(failure) ? (
        <Box style={styles.retry}>
          <Button label={t('action.retry')} onPress={onRetry} />
        </Box>
      ) : null}
    </Box>
  );
}

/** What stands under the last card of a feed: the next part on its way, or the failure to fetch it. */
export function FeedFooter({ foot, onRetry }: FeedFooterProps): ReactNode {
  const styles = useStyles();
  switch (foot.kind) {
    case 'none':
      return null;
    case 'coming':
      return (
        <Box style={styles.under}>
          <FootComing day={foot.day} />
        </Box>
      );
    case 'failed':
      return (
        <Box style={styles.under}>
          <FootFailed failure={foot.failure} onRetry={onRetry} />
        </Box>
      );
  }
}
