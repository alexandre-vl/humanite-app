import type { ReactNode } from 'react';
import { SectionTitle } from '#components/section-title';
import { ArticleFeed, liveFeedQuery } from '#entities/article';
import { t } from '#i18n';
import { Scroll } from '#primitives/scroll';
import { Surface } from '#primitives/surface';

/** The En continu screen: the same articles as a wire that scrolls under its own title. */
export function LivePage(): ReactNode {
  return (
    <Surface>
      <Scroll>
        <SectionTitle title={t('nav.live')} />
        <ArticleFeed query={liveFeedQuery} />
      </Scroll>
    </Surface>
  );
}
