import type { ContentErrorCode } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { canRetry } from '#api';
import { Button } from '#components/button';
import type { EmptyStateProps } from '#components/empty-state';
import { EmptyState } from '#components/empty-state';
import { t } from '#i18n';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import type { FeedState } from '../model/paged-feed';

/**
 * What a screen says in place of a feed that holds nothing, when its own words are truer than the paper's.
 *
 * It is the component's own props under another name rather than the same two fields written again: the words are
 * handed on untouched, so a third field added to the stand-in would otherwise have to be added here too, and the
 * screens that pass these words would keep type-checking while dropping it.
 */
export type EmptyWords = EmptyStateProps;

export type FeedStandInProps = Readonly<{
  state: FeedState;
  onRetry: () => void;
  /**
   * What stands where the answer will be, while it is on its way.
   *
   * It is required and handed in rather than chosen here, because what is coming is the caller's to know and never
   * this component's: a page of the paper is about to hold cards in a rhythm, a wire is about to hold a thread of
   * hours, and a search is about to hold anything at all. Nine identical bars stood here for all three, and told a
   * reader the same nothing whichever screen they had opened.
   */
  awaited: ReactNode;
  empty?: EmptyWords | undefined;
}>;

const useStyles = createStyles(() => ({
  standIn: { gap: SPACING.md, padding: SPACING.lg },
  retry: { alignItems: 'center' },
}));

/**
 * What a reader is told of a failure, in the words the dictionary gives its cause. The key is built from the code, so
 * a cause the contract adds is a key missing from the dictionary, and that stops the build here.
 */
export const failureWords = (failure: ContentErrorCode): EmptyWords => ({
  title: t(`failure.${failure}.title`),
  message: t(`failure.${failure}.message`),
});

/**
 * What stands in a feed's place: shapes while it loads, a failure said by its cause, or an empty shelf. Every feed and
 * every screen that reads one shows it, so what a reader is told when nothing arrives does not depend on which screen
 * asked.
 *
 * A failure is offered another try only when one could answer differently: a page the paper does not have, a page it
 * refuses this reader, and an answer no reading could make sense of all come back the same, and a button that can only
 * fail again is a button that lies. The empty shelf can be said in the screen's own words: an unpublished paper and a
 * question that matched nothing are both a feed holding nothing, and only the screen knows which.
 */
export function FeedStandIn({ state, onRetry, awaited, empty }: FeedStandInProps): ReactNode {
  const styles = useStyles();
  switch (state.kind) {
    case 'pending':
      return awaited;
    case 'failed': {
      const words = failureWords(state.failure);
      return (
        <Box style={styles.standIn}>
          <EmptyState title={words.title} message={words.message} />
          {canRetry(state.failure) ? (
            <Box style={styles.retry}>
              <Button label={t('action.retry')} onPress={onRetry} />
            </Box>
          ) : null}
        </Box>
      );
    }
    case 'empty': {
      const words = empty ?? { title: t('feed.empty.title'), message: t('feed.empty.message') };
      return <EmptyState title={words.title} message={words.message} />;
    }
  }
}
