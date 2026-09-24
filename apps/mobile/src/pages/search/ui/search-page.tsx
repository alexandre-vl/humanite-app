import { SPACING } from '@huma/design-tokens';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { EmptyState } from '#components/empty-state';
import { ArticleFeed, feedOf, questionOf, searchQuery, usePagedFeed, useReadMatches } from '#entities/article';
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
  heading: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, gap: SPACING.xs },
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
 * no source can be counted on to.
 *
 * The screen never empties while it waits. The journal's search takes between a second and a half and two seconds,
 * and is never served from a cache — a question is never twice the same — so a reader typing a second word used to
 * watch the first word's answer turn into nine grey bars for that whole time. Now there are three things it can show,
 * in this order, and each is named for what it is:
 *
 *  · the answer to this question, once the journal has given one;
 *  · the answer to the one before, while the next is on its way, with a line saying the journal is still looking;
 *  · on a first question, when there is no answer to keep, the articles the app has already read whose title or
 *    standfirst hold the word — a true answer, and a smaller one, dropped the moment the journal's arrives.
 */
export function SearchPage(): ReactNode {
  const styles = useStyles();
  const [typed, setTyped] = useState('');
  const question = questionOf(useDebounced(typed));
  const asked = usePagedFeed(searchQuery(question));
  const read = useReadMatches(question);
  // What the app can answer by itself stands in only while the journal has answered nothing at all — neither this
  // question nor the one before. As soon as either is on screen, that is the answer, and a second list under it
  // would be the same articles twice.
  const standingIn = asked.items.length === 0 && read.length > 0;
  const feed = standingIn ? feedOf(read) : asked;
  const waiting = standingIn || asked.answering;
  return (
    <Surface>
      <SearchField value={typed} onChange={setTyped} />
      {question === null || feed.items.length === 0 ? null : (
        <Box style={styles.heading}>
          <Text variant="label">
            {standingIn ? t('search.read', { query: question }) : t('search.for', { query: question })}
          </Text>
          {waiting ? <Text variant="caption">{t('search.asking')}</Text> : null}
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
