import { SECTION_ID } from '@huma/contracts';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { EmptyState } from '#components/empty-state';
import { TopBar } from '#components/top-bar';
import { ArticleFeed, sectionFeedQuery, usePagedFeed } from '#entities/article';
import { SectionBar, sectionsQuery } from '#entities/section';
import { BookmarkToggle } from '#features/bookmark';
import { t } from '#i18n';
import { articleHref, sectionHref, useRouteParams } from '#lib/routing';
import { Surface } from '#primitives/surface';

/**
 * One section's feed, under the band of sections it belongs to.
 *
 * The parameter is parsed rather than read: a `SectionId` is a branded string only the contract's parser mints, so a
 * link whose value is not shaped like one never reaches the feed. Its shape is all the contract checks, the sections
 * themselves being the newsroom's to publish — so the screen asks for the list and says so when the one it was handed
 * is not on it, rather than serving an empty feed that would read as a section with nothing in it.
 *
 * Choosing another section replaces this screen instead of stacking one more, so going back leaves the sections rather
 * than walking every one already visited.
 *
 * The bar is named as soon as the list answers and carries no name before then: a section is named by the newsroom,
 * and a screen that guessed one from the address would print whatever the address happened to spell.
 */
export function SectionPage(): ReactNode {
  const id = useRouteParams((raw) => SECTION_ID.parse(raw['id']));
  const sections = useQuery(sectionsQuery).data;
  const section = sections?.find((one) => one.id === id) ?? null;
  const unknown = sections !== undefined && section === null;
  const feed = usePagedFeed(sectionFeedQuery(id));
  return (
    <Surface>
      <TopBar
        title={section?.label}
        onBack={() => {
          router.back();
        }}
      />
      {unknown ? (
        <EmptyState title={t('section.unknown.title')} message={t('section.unknown.message')} />
      ) : (
        <ArticleFeed
          feed={feed}
          rhythm="paper"
          onOpen={(article) => {
            router.push(articleHref(article));
          }}
          action={(summary) => <BookmarkToggle id={summary.id} />}
          sticky={
            <SectionBar
              active={id}
              onSelect={(chosen) => {
                router.replace(sectionHref(chosen));
              }}
            />
          }
        />
      )}
    </Surface>
  );
}
