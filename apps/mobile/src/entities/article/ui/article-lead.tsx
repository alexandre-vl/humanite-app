import type { Article, DisplayText } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { pictureOf } from '#api';
import { formatPublished } from '#lib/format';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Text } from '#primitives/text';

import { frameOf } from '../model/format';
import { ArticleFigure } from './article-figure';
import { ArticleFilm } from './article-film';
import { ItemWord } from './item-word';

export type ArticleTitleProps = Readonly<{ title: DisplayText; word: DisplayText | null }>;
export type ArticleLeadProps = Readonly<{
  article: Article;
  byline: DisplayText | null;
  onFollow: (url: string) => void;
}>;

const useStyles = createStyles(() => ({
  // One measure for everything that is read, the body's own. The head used to keep a wider one, so the first line of
  // an article started further in than every line after it.
  title: { paddingHorizontal: SPACING.lg, gap: SPACING.xs },
  standfirst: { paddingHorizontal: SPACING.lg },
  meta: { gap: SPACING.xs, paddingHorizontal: SPACING.lg },
}));

/**
 * An article's headline, under the word for what it is when it is not an article, set flush left on the page the
 * article is read on.
 *
 * It was centred, and centred over five lines: every line began at a different place, so a reader arriving at the end
 * of one had to hunt for the start of the next. The W3C's own low-vision guidance lists centred blocks of text as a
 * failure — a magnified reader can miss a centred line entirely — and of the six papers worth copying not one centres
 * a headline: the Guardian's headline component declares no alignment at all, and the BBC's typography foundations
 * say in as many words to align text along its left-hand side.
 *
 * It sat on a ground of its own as well, above a white sheet with one corner turned. That is not how a paper prints an
 * article; it is how a phone draws a modal, and Le Figaro's own stylesheet uses exactly that radius for its share
 * sheet and nothing else. A coloured ground behind a headline is real — the Guardian paints one — but full bleed, with
 * no card under it, and only for the pieces it calls immersive. A daily's own news article is printed on the page.
 *
 * The word over it is the one a card prints over the same title — a video, a piece of opinion, a chapter of a series,
 * a running coverage — so an article opened from anywhere says what it is before it says anything else.
 */
export function ArticleTitle({ title, word }: ArticleTitleProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.title}>
      <ItemWord word={word} />
      <Text variant="headline" heading>
        {title}
      </Text>
    </Box>
  );
}

/**
 * What comes before the body: the standfirst, who signed and when, then the picture and what is written under it.
 * Only the words keep the column's margins; the picture runs to both edges of the page.
 *
 * The signature moved above the picture, which is where the Guardian's own mobile template for an opinion piece puts
 * it — title, headline, standfirst, meta, media, body — and where the BBC puts it, wrapped into one unit with the
 * time. Under the picture it was answering the caption rather than the headline, so an article opened on a photograph
 * credited to one person and signed, four lines later and past a second credit, by another.
 *
 * A video opens on its film, right under its headline, and shows no picture further down: the film's still is the
 * article's picture, and showing it twice would say nothing more. What reads as a video is its format — the service
 * sends a link to the film and a body of prose, when any, that says nothing of it.
 *
 * The head is the same whether the body follows or not. An article whose body the source keeps back from this reader
 * still carries its title, its standfirst and its picture, and the wall that says why the rest is not there is laid
 * where the body would run — under this, not in place of it.
 */
export function ArticleLead({ article, byline, onFollow }: ArticleLeadProps): ReactNode {
  const styles = useStyles();
  const hero = article.hero;
  const film = frameOf(article.format) === 'film';
  const visual = film ? null : pictureOf(article, 'lead');
  const played = article.film;
  return (
    <>
      {film ? (
        <ArticleFilm
          poster={pictureOf(article, 'lead')}
          recyclingKey={article.id}
          onPlay={
            played === undefined
              ? null
              : () => {
                  onFollow(played.url);
                }
          }
        />
      ) : null}
      {/* An article whose body opens on the words a list stood in for its missing standfirst has none of its own. */}
      {article.standfirst === undefined ? null : (
        <Box style={styles.standfirst}>
          <Text variant="standfirst">{article.standfirst}</Text>
        </Box>
      )}
      <Box style={styles.meta}>
        {/* Named a label rather than left to the default: the signature fell to the body's own type, so who wrote a
            piece was set in the same letters, at the same size and in the same ink as the piece itself. */}
        {byline === null ? null : <Text variant="label">{byline}</Text>}
        <Text variant="caption">{formatPublished(article.publishedAt)}</Text>
      </Box>
      {visual === null || hero === undefined ? null : (
        <ArticleFigure
          visual={visual}
          frame={frameOf(article.format)}
          recyclingKey={article.id}
          caption={hero.caption}
          credit={hero.credit}
        />
      )}
    </>
  );
}
