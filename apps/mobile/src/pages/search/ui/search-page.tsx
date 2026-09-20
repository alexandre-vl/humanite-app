import { SPACING } from '@huma/design-tokens';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { EmptyState } from '#components/empty-state';
import { ArticleFeed, searchQuery, searchable, usePagedFeed } from '#entities/article';
import { BookmarkToggle } from '#features/bookmark';
import { t } from '#i18n';
import { articleHref } from '#lib/routing';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Surface } from '#primitives/surface';
import { Text } from '#primitives/text';
import { countLabel } from '../model/count';
import { useDebounced } from '../model/debounced';
import { SearchField } from './search-field';

const useStyles = createStyles(() => ({
  count: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
}));

/**
 * The Recherche screen: a field that stays where it is, and under it what the question reached.
 *
 * The field is not a band of the list. A band either scrolls away or is pinned to a height the list fixes, and a field
 * a reader is typing in must do neither — so the screen holds it itself, above the one scrolling region it has.
 *
 * Nothing is asked until the typing settles and the field holds a question; until then the screen says what it
 * searches, which is the one thing a reader cannot guess and the paper's own screen leaves blank. The count is shown
 * only once there is something to count: while an answer is on its way the previous one is still on screen, and a
 * number that flickered to zero and back would be read as a wrong answer rather than as an unfinished one.
 */
export function SearchPage(): ReactNode {
  const styles = useStyles();
  const [typed, setTyped] = useState('');
  const asked = useDebounced(typed).trim();
  const feed = usePagedFeed(searchQuery(asked));
  return (
    <Surface>
      <SearchField value={typed} onChange={setTyped} />
      {feed.items.length === 0 ? null : (
        <Box style={styles.count}>
          <Text variant="label">{countLabel(feed.total, asked)}</Text>
        </Box>
      )}
      {searchable(asked) ? (
        <ArticleFeed
          feed={feed}
          onOpen={(id) => {
            router.push(articleHref(id));
          }}
          action={(summary) => <BookmarkToggle id={summary.id} />}
          empty={{ title: t('search.none.title', { query: asked }), message: t('search.none.message') }}
        />
      ) : (
        <EmptyState title={t('search.rest.title')} message={t('search.rest.message')} />
      )}
    </Surface>
  );
}
