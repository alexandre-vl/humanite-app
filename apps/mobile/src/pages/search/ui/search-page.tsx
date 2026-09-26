import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { EmptyState } from '#components/empty-state';
import { ArticleFeed, questionOf, searchQuery, usePagedFeed } from '#entities/article';
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
 * The list holds the journal's answer and nothing else. While the journal looked, it held the articles the app had
 * already read whose title or standfirst held the question: a truer and smaller answer, given at once. Typing
 * « climat » on the iPhone simulator on 26/09/2026, that was 27 to 48 articles for one to two seconds and a third,
 * which the journal's answer then replaced with ten others — a reader took them for the answer, and the answer, when
 * it came, for a smaller one. Nothing on the screen told the two apart, and nothing could: both were articles of the
 * paper, listed under the same question.
 *
 * So while the journal looks, cards stand where its answer will be, drawn as it will be drawn, breathing, and the
 * rule under the field says the journal is looking — in words too, to a reader listening to the screen. The answer
 * takes their place when it comes, and its next pages as the reader goes down it. A journal that finds nothing says so
 * for the question typed, and one that cannot be reached says why, with a try again.
 *
 * The journal's search takes between a second and a half and two seconds and is never served from a cache, a
 * question never being twice the same (mesuré le 24/09/2026 : 1 552 à 1 923 ms sur huit questions jamais posées).
 */
export function SearchPage(): ReactNode {
  const [typed, setTyped] = useState('');
  // A line that holds no question is taken at once. The wait is there so that a word being typed is asked once, and a
  // line emptied is not being typed in.
  const question = questionOf(useDebounced(typed, (text) => questionOf(text) === null));
  const answer = usePagedFeed(searchQuery(question));
  // The journal is looking until it has answered for the first page — with articles, with none, or with a failure —
  // and no longer: the pages after it are said at the foot of the list, where the reader who reaches the end looks.
  const searching = question !== null && answer.state.kind === 'pending';
  return (
    <Surface>
      <SearchField value={typed} onChange={setTyped} busy={searching} />
      {question === null ? (
        <EmptyState title={t('search.rest.title')} message={t('search.rest.message')} />
      ) : (
        <ArticleFeed
          // One list for each answer, opening at its top. A list kept from one answer to the next kept how far down the
          // reader had scrolled, and the next answer opened as far down — past its own end, on a blank page, when it
          // was shorter.
          key={question}
          feed={answer}
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
