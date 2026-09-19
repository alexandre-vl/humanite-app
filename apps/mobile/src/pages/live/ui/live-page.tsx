import type { ReactNode } from 'react';
import { SectionTitle } from '#components/section-title';
import { ArticleFeed, liveFeedQuery } from '#entities/article';
import { t } from '#i18n';
import { Surface } from '#primitives/surface';

/** The En continu screen: the same articles as a wire, under a title that slides away as the wire scrolls. */
export function LivePage(): ReactNode {
  return (
    <Surface>
      <ArticleFeed query={liveFeedQuery} header={<SectionTitle title={t('nav.live')} />} />
    </Surface>
  );
}
