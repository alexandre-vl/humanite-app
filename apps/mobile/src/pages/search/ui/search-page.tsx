import { SPACING } from '@huma/design-tokens';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { EmptyState } from '#components/empty-state';
import { ArticleFeed, questionOf, searchQuery, usePagedFeed } from '#entities/article';
import { BookmarkToggle } from '#features/bookmark';
import { t } from '#i18n';
import { articleHref } from '#lib/routing';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Surface } from '#primitives/surface';
import { Text } from '#primitives/text';
import { dismissKeyboard } from '#primitives/text-field';
import { useDebounced } from '../model/debounced';
import { SearchField } from './search-field';

const useStyles = createStyles(() => ({
  heading: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
}));

/**
 * The Recherche screen: a field that stays where it is, and under it what the question reached.
 *
 * The field is not a band of the list. A band either scrolls away or is pinned to a height the list fixes, and a field
 * a reader is typing in must do neither — so the screen holds it itself, above the one scrolling region it has.
 *
 * Nothing is asked until the typing settles and the field holds a question; until then the screen says what it
 * searches, which is the one thing a reader cannot guess and the paper's own screen leaves blank. The line over the
 * answers names the question they answer, and counts nothing: the journal's search says how many it found nowhere, so
 * no source can be counted on to. It is shown only once there is an answer, the previous one staying on screen while
 * the next is on its way.
 */
export function SearchPage(): ReactNode {
  const styles = useStyles();
  const [typed, setTyped] = useState('');
  const question = questionOf(useDebounced(typed));
  const feed = usePagedFeed(searchQuery(question));
  return (
    <Surface>
      <SearchField value={typed} onChange={setTyped} />
      {question === null || feed.items.length === 0 ? null : (
        <Box style={styles.heading}>
          <Text variant="label">{t('search.for', { query: question })}</Text>
        </Box>
      )}
      {question === null ? (
        <EmptyState title={t('search.rest.title')} message={t('search.rest.message')} />
      ) : (
        <ArticleFeed
          feed={feed}
          rhythm="list"
          onOpen={(id) => {
            dismissKeyboard();
            router.push(articleHref(id));
          }}
          action={(summary) => <BookmarkToggle summary={summary} />}
          empty={{ title: t('search.none.title', { query: question }), message: t('search.none.message') }}
        />
      )}
    </Surface>
  );
}
