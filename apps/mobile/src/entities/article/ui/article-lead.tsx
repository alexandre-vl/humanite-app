import type { Article, DisplayText } from '@huma/contracts';
import { SIZES, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { pictureOf } from '#api';
import { formatLongDate } from '#lib/format';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Text } from '#primitives/text';

import { ArticleFigure } from './article-figure';

export type ArticleTitleProps = Readonly<{ title: DisplayText; name: DisplayText | null }>;
export type ArticleLeadProps = Readonly<{ article: Article; byline: DisplayText | null }>;

const useStyles = createStyles((theme) => ({
  // One measure for everything that is read, the body's own. The head used to keep a wider one, so the first line of
  // an article started further in than every line after it.
  title: { paddingHorizontal: SPACING.lg, gap: SPACING.xs },
  standfirst: { paddingHorizontal: SPACING.lg },
  meta: { gap: SPACING.xs, paddingHorizontal: SPACING.lg },
  rule: { height: SIZES.stroke, marginHorizontal: SPACING.lg, backgroundColor: theme.rule },
}));

/**
 * An article's headline, under the name of the section it ran in, set flush left on the page the article is read on.
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
 * The section over it is what every paper worth copying prints there and what this one printed nowhere: an article
 * opened from a search, from a shelf of kept pieces or from a link inside another article arrived with nothing at all
 * saying which part of the paper it came from.
 */
export function ArticleTitle({ title, name }: ArticleTitleProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.title}>
      {name === null ? null : <Text variant="kicker">{name}</Text>}
      <Text variant="headline" heading>
        {title}
      </Text>
    </Box>
  );
}

/**
 * What comes before the body: the standfirst, who signed and when, then the picture and what is written under it,
 * closed by a rule. Only the words keep the column's margins; the picture runs to both edges of the page.
 *
 * The signature moved above the picture, which is where the Guardian's own mobile template for an opinion piece puts
 * it — title, headline, standfirst, meta, media, body — and where the BBC puts it, wrapped into one unit with the
 * time. Under the picture it was answering the caption rather than the headline, so an article opened on a photograph
 * credited to one person and signed, four lines later and past a second credit, by another.
 *
 * The date is written out in full here and nowhere else in the paper. Nielsen's homepage guideline is the reason both
 * ways round: a front page of one week's stories needs no date on each card, and the full article needs one printed
 * prominently. So the cards lost theirs and this one gained the month and the year.
 *
 * An article that plays a video shows no picture here. The player has no still of its own and shows the article's
 * picture instead; showing it twice, once above the player and once inside it, would say nothing more. It is asked of
 * the body and not of the format: a video of the journal comes with no player in its body — the service sends a link
 * to the film and no prose at all — and hiding its picture on the strength of its format left the page with nothing.
 *
 * Nothing marks a reserved article. The content serves its body whole whatever the reader holds, no capture of the
 * current app shows a wall, and a mark over an article one is reading in full would only puzzle.
 */
export function ArticleLead({ article, byline }: ArticleLeadProps): ReactNode {
  const styles = useStyles();
  const hero = article.hero;
  const plays = article.blocks.some((block) => block.type === 'video');
  const visual = plays ? null : pictureOf(article, 'lead');
  return (
    <>
      <Box style={styles.standfirst}>
        <Text variant="standfirst">{article.standfirst}</Text>
      </Box>
      <Box style={styles.meta}>
        {/* Named a label rather than left to the default: the signature fell to the body's own type, so who wrote a
            piece was set in the same letters, at the same size and in the same ink as the piece itself. */}
        {byline === null ? null : <Text variant="label">{byline}</Text>}
        <Text variant="caption">{formatLongDate(article.publishedAt)}</Text>
      </Box>
      {visual === null || hero === undefined ? null : (
        <ArticleFigure visual={visual} recyclingKey={article.id} caption={hero.caption} credit={hero.credit} />
      )}
      <Box style={styles.rule} />
    </>
  );
}
