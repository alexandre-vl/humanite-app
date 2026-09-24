import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { EmptyState } from '#components/empty-state';
import { ArticleFeed, feedOf, questionOf, searchQuery, usePagedFeed, useReadMatches } from '#entities/article';
import { BookmarkToggle } from '#features/bookmark';
import { t } from '#i18n';
import { articleHref } from '#lib/routing';
import { Surface } from '#primitives/surface';
import { dismissKeyboard } from '#primitives/text-field';
import { useDebounced } from '../model/debounced';
import { SearchField } from './search-field';

/**
 * The Recherche screen: a field that stays where it is, a rule that says whether the journal is still being asked,
 * and under them one list.
 *
 * The field is not a band of the list. A band either scrolls away or is pinned to a height the list fixes, and a
 * field a reader is typing in must do neither — so the screen holds it itself, above the one scrolling region it has.
 *
 * There is one list and it always answers the question in the field. It had three: the journal's answer to this
 * question, the journal's answer to the question before while this one was fetched, and the articles the app had
 * already read — each under a heading of its own naming which it was. Three answers and three headings is a screen
 * a reader has to read before they can read the paper, and one of the three was an answer to a question they had
 * already finished typing over. What is left is the true, smaller answer the app can give at once — the articles it
 * has read whose title or standfirst hold the word — until the journal's own arrives and takes its place.
 *
 * Nothing names which of the two is on screen. The rule under the field does it, and does it continuously: while a
 * segment of red is crossing it the journal is still looking, and what is listed is provisional; when the rule is
 * whole again the list is the journal's answer. One signal, always visible, in the one place a reader is already
 * looking — instead of a caption that appears, a heading that changes its words, and a second heading under it.
 *
 * The journal's search takes between a second and a half and two seconds and is never served from a cache, a
 * question never being twice the same (mesuré le 24/09/2026 : 1 552 à 1 923 ms sur huit questions jamais posées).
 * That is the whole reason any of this exists.
 */
export function SearchPage(): ReactNode {
  const [typed, setTyped] = useState('');
  const question = questionOf(useDebounced(typed));
  const asked = usePagedFeed(searchQuery(question));
  const read = useReadMatches(question);
  // What the app can answer by itself stands in only while the journal has answered nothing to this question. The
  // moment it answers, that is the answer — a second list under it would be the same articles twice.
  const standingIn = asked.items.length === 0 && read.length > 0;
  const feed = standingIn ? feedOf(read) : asked;
  const searching = question !== null && (standingIn || asked.state.kind === 'pending');
  return (
    <Surface>
      <SearchField value={typed} onChange={setTyped} busy={searching} />
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
          // Nothing while the journal looks and the app has nothing of its own: a page of grey cards would be saying
          // what is coming, and a search is answered with anything, of any length, on any subject. The rule above is
          // already saying the one true thing there is to say.
          awaited={null}
          empty={{ title: t('search.none.title', { query: question }), message: t('search.none.message') }}
        />
      )}
    </Surface>
  );
}
