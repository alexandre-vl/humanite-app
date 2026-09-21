import { ISSUE_ID } from '@huma/contracts';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { EmptyState } from '#components/empty-state';
import { TopBar } from '#components/top-bar';
import { ArticleFeed, stateOf } from '#entities/article';
import type { ReadFeed } from '#entities/article';
import { issueQuery, issuesQuery } from '#entities/issue';
import { BookmarkToggle } from '#features/bookmark';
import { t } from '#i18n';
import { formatDayLabel } from '#lib/format';
import { articleHref, useRouteParams } from '#lib/routing';
import { Surface } from '#primitives/surface';

/**
 * One numéro, read as a sommaire: everything that day's paper held, in the order the newsroom runs its sections.
 *
 * The order is what makes this a numéro rather than a third feed. The front page hoists what it opens on and
 * alternates its blocks, the wire runs by the minute; a sommaire runs Politique, Social Éco, Société and so on down
 * the paper, which is what the running order carried in the sections has always been for. The cards are therefore all
 * lines: a rank here belongs to the paper's own order, and dressing the first as a une would say the desk chose it a
 * second time.
 *
 * The parameter is parsed rather than read — an `IssueId` is a branded string only the contract's parser mints — and
 * its shape is all the contract checks, the days the paper actually printed being the paper's own. So the screen asks
 * for the shelf and says a numéro is not on it, rather than showing an empty sommaire that would read as a day the
 * newsroom filed nothing on. The shelf never goes stale and is already in hand for a reader who came from it.
 *
 * The day is named in the bar, as every pushed screen names itself, and read off the shelf rather than off the
 * sommaire: arriving from the newsstand, the bar carries the day from the first frame.
 */
export function IssuePage(): ReactNode {
  const id = useRouteParams((raw) => ISSUE_ID.parse(raw['id']));
  const shelf = useQuery(issuesQuery).data;
  const issue = shelf?.find((one) => one.id === id) ?? null;
  const unknown = shelf !== undefined && issue === null;
  const { data: items, status, refetch } = useQuery(issueQuery(id));
  const feed: ReadFeed = {
    items: items ?? [],
    state: stateOf(status),
    retry: () => {
      void refetch();
    },
  };
  return (
    <Surface>
      <TopBar
        title={issue === null ? undefined : formatDayLabel(issue.opener.publishedAt)}
        onBack={() => {
          router.back();
        }}
      />
      {unknown ? (
        <EmptyState title={t('issue.unknown.title')} message={t('issue.unknown.message')} />
      ) : (
        <ArticleFeed
          feed={feed}
          rhythm="list"
          onOpen={(article) => {
            router.push(articleHref(article));
          }}
          action={(summary) => <BookmarkToggle id={summary.id} />}
        />
      )}
    </Surface>
  );
}
