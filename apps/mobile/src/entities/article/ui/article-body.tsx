import type { Article, Block, LinkTarget } from '@huma/contracts';
import { SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { pictureOf, visualOf } from '#api';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { RichText, Text } from '#primitives/text';

import { runsOf } from '../model/spans';
import { ArticleCallout } from './article-callout';
import { ArticleFigure } from './article-figure';
import { ArticleRelated } from './article-related';
import { ArticleVideo } from './article-video';

export type ArticleBodyProps = Readonly<{
  article: Article;
  /** The blocks of the body the reader was given, which only an open body has. */
  blocks: readonly Block[];
  onFollow: (target: LinkTarget) => void;
  onSupport: () => void;
}>;

type BlockProps = Omit<ArticleBodyProps, 'blocks'> & Readonly<{ block: Block }>;

const useStyles = createStyles((theme) => ({
  words: { paddingHorizontal: SPACING.lg },
  // More air above a crosshead than under it. The column sets one gap between everything on it, which leaves a
  // crosshead floating equidistant from the paragraph it closes and the one it opens — and it opens one.
  crosshead: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm },
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
function BlockView({ block, article, onFollow, onSupport }: BlockProps): ReactNode {
  const styles = useStyles();
  switch (block.type) {
    case 'paragraph':
      return (
        <Box style={styles.words}>
          <RichText runs={runsOf(block.spans, onFollow)} />
        </Box>
      );
    case 'heading':
      // A crosshead, not a second headline. It was set in the very type the article's own title is set in — the same
      // twenty-eight points of the same red — so a piece with three of them shouted its title four times, each as
      // loud as the last, and the reader had nothing left to tell which one was the article. Twenty points of the
      // text face, in the ink of the text: a step down from the title and a step up from the paragraphs it opens.
      return (
        <Box style={styles.crosshead}>
          <Text variant="title" heading>
            {block.text}
          </Text>
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
      const visual = visualOf({ kind: 'corpus', key: block.key }, 'lead');
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
    case 'related':
      return (
        <ArticleRelated
          summary={block.summary}
          onOpen={() => {
            onFollow({ kind: 'article', id: block.summary.id });
          }}
        />
      );
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
export function ArticleBody({ article, blocks, onFollow, onSupport }: ArticleBodyProps): ReactNode {
  return (
    <>
      {place(blocks).map(({ key, block }) => (
        <BlockView key={key} block={block} article={article} onFollow={onFollow} onSupport={onSupport} />
      ))}
    </>
  );
}
