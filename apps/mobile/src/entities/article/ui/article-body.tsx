import type { Article, ArticleSummary, Block } from '@huma/contracts';
import { SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { pictureOf, visualOf } from '#api';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { RichText, Text } from '#primitives/text';

import type { LinkTarget } from '../model/spans';
import { runsOf } from '../model/spans';
import { ArticleCallout } from './article-callout';
import { ArticleFigure } from './article-figure';
import { ArticleRelated } from './article-related';
import { ArticleVideo } from './article-video';

export type ArticleBodyProps = Readonly<{
  article: Article;
  related: readonly ArticleSummary[];
  onFollow: (target: LinkTarget) => void;
  onSupport: () => void;
}>;

type BlockProps = ArticleBodyProps & Readonly<{ block: Block }>;

const useStyles = createStyles((theme) => ({
  words: { paddingHorizontal: SPACING.lg },
  quote: {
    gap: SPACING.xs,
    marginHorizontal: SPACING.lg,
    paddingLeft: SPACING.lg,
    borderLeftWidth: SIZES.stroke,
    borderColor: theme.primary,
  },
}));

/**
 * One block of a body, rendered as the one thing it is. The switch answers for the seven kinds the contract declares,
 * so a kind added there stops the build rather than rendering as nothing at all.
 *
 * A body picture carries a caption and no credit: the contract gives a credit only to the article's own picture, so a
 * figure inside the body has none to show, and says so by not showing one.
 */
function BlockView({ block, article, related, onFollow, onSupport }: BlockProps): ReactNode {
  const styles = useStyles();
  switch (block.type) {
    case 'paragraph':
      return (
        <Box style={styles.words}>
          <RichText runs={runsOf(block.spans, onFollow)} />
        </Box>
      );
    case 'heading':
      return (
        <Box style={styles.words}>
          <Text variant="headline">{block.text}</Text>
        </Box>
      );
    case 'quote':
      return (
        <Box style={styles.quote}>
          <RichText runs={runsOf(block.spans, onFollow)} />
          {block.source === undefined ? null : <Text variant="legend">{block.source}</Text>}
        </Box>
      );
    case 'image': {
      const visual = visualOf(block.key, 'lead');
      return visual === null ? null : (
        <ArticleFigure visual={visual} recyclingKey={`${article.id}-${block.key}`} caption={block.caption} />
      );
    }
    case 'video':
      return (
        <ArticleVideo
          title={block.title}
          durationSeconds={block.durationSeconds}
          poster={pictureOf(article, 'lead')}
          recyclingKey={`${article.id}-video`}
        />
      );
    case 'related': {
      const summary = related.find((candidate) => candidate.id === block.id) ?? null;
      return summary === null ? null : (
        <ArticleRelated
          summary={summary}
          onOpen={() => {
            onFollow({ kind: 'article', id: block.id });
          }}
        />
      );
    }
    case 'callout':
      return <ArticleCallout title={block.title} text={block.text} button={block.button} onPress={onSupport} />;
  }
}

/** A block and what to call it by: the nth of its kind, which a body never reorders and never repeats. */
type PlacedBlock = Readonly<{ key: string; block: Block }>;

const place = (blocks: readonly Block[]): readonly PlacedBlock[] => {
  const counted = new Map<string, number>();
  return blocks.map((block): PlacedBlock => {
    const nth = (counted.get(block.type) ?? 0) + 1;
    counted.set(block.type, nth);
    return { key: `${block.type}:${String(nth)}`, block };
  });
};

/** The body of an article, block by block, in the order it was written. */
export function ArticleBody({ article, related, onFollow, onSupport }: ArticleBodyProps): ReactNode {
  return (
    <>
      {place(article.blocks).map(({ key, block }) => (
        <BlockView
          key={key}
          block={block}
          article={article}
          related={related}
          onFollow={onFollow}
          onSupport={onSupport}
        />
      ))}
    </>
  );
}
