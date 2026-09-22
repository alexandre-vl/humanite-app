import type { Article, ArticleId, ArticleSummary, DisplayText, SectionId } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { t } from '#i18n';
import { createStyles } from '#lib/styles';
import { Scroll } from '#primitives/scroll';
import { ThemeScope } from '#primitives/theme';
import { articleQuery, summariesQuery } from '../api/queries';
import { signatureOf } from '../model/byline';
import { stateOf } from '../model/paged-feed';
import type { LinkTarget } from '../model/spans';
import { relatedIds } from '../model/spans';
import { ArticleBody } from './article-body';
import { ArticleLead, ArticleTitle } from './article-lead';
import { FeedStandIn } from './feed-stand-in';

export type ArticleReaderProps = Readonly<{
  id: ArticleId;
  /**
   * What the newsroom calls the section an article ran in. It is answered by the screen because the sections are
   * another entity's, and an entity may not reach sideways for one.
   */
  names: (section: SectionId | undefined) => DisplayText | null;
  onFollow: (target: LinkTarget) => void;
  onSupport: () => void;
}>;

type ReadingProps = Readonly<{
  article: Article;
  name: DisplayText | null;
  related: readonly ArticleSummary[];
  onFollow: (target: LinkTarget) => void;
  onSupport: () => void;
}>;

const useStyles = createStyles((theme) => ({
  page: { flex: 1, backgroundColor: theme.background },
  // One measure down the page, and one gap between everything on it: the head, the picture, every paragraph and
  // every crosshead are all things read in a row, and a gap that changed between them would be saying they are not.
  column: { gap: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.xxxl },
}));

/**
 * The article as it is read: one page, one ground, from the section over the headline down to the last paragraph.
 *
 * It was two — a coloured band carrying the headline, and under it a white sheet with its top-left corner turned by
 * forty-eight points. Neither half survives inspection. Of the six papers worth copying, none prints an article body
 * on a card: the Guardian, the BBC and Le Monde all draw a front and an article on one ground and separate things
 * with a hairline, and the only rounded-top surfaces in any of their stylesheets are modals and share sheets — Le
 * Figaro's own CSS gives that radius to `.fig-share-tools` and to a tooltip turned into a bottom modal. On a phone
 * the turned corner is a promise that the thing can be swiped away, which an article cannot keep.
 *
 * The dark theme had already said as much by accident: there its ground and its sheet take the same value, the sheet
 * stops showing, and the page runs edge to edge — which is what every article does now.
 */
function Reading({ article, name, related, onFollow, onSupport }: ReadingProps): ReactNode {
  const styles = useStyles();
  return (
    <Scroll axis="vertical" style={styles.page} contentStyle={styles.column}>
      <ArticleTitle title={article.title} name={name} />
      <ArticleLead article={article} byline={signatureOf(article)} />
      <ArticleBody article={article} related={related} onFollow={onFollow} onSupport={onSupport} />
    </Scroll>
  );
}

/**
 * One article, read whole. The body arrives first and names the articles it points at; their summaries are asked for
 * in one call rather than one at a time.
 *
 * A video article is laid on the dark theme whatever the reader's phone is set to. That ground belongs to what is
 * being read, not to a setting: the current app prints its videos on it and everything else on the light sheet, and a
 * reader who has chosen dark keeps it for every other article.
 */
export function ArticleReader({ id, names, onFollow, onSupport }: ArticleReaderProps): ReactNode {
  const { data: article, status, refetch } = useQuery(articleQuery(id));
  const related = useQuery(summariesQuery(article === undefined ? [] : relatedIds(article.blocks))).data ?? [];
  if (article === undefined) {
    return (
      <FeedStandIn
        state={stateOf(status)}
        onRetry={() => {
          void refetch();
        }}
        error={{ title: t('article.error.title'), message: t('article.error.message') }}
      />
    );
  }
  const reading = (
    <Reading
      article={article}
      name={names(article.section)}
      related={related}
      onFollow={onFollow}
      onSupport={onSupport}
    />
  );
  return article.format === 'video' ? <ThemeScope name="dark">{reading}</ThemeScope> : reading;
}
