import { SPACING } from '@huma/design-tokens';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ArticleFeed, feedOf } from '#entities/article';
import { BookmarkToggle, useBookmarks } from '#features/bookmark';
import { t } from '#i18n';
import { articleHref } from '#lib/routing';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Surface } from '#primitives/surface';
import { Text } from '#primitives/text';

/**
 * The name is laid on the same margin as the first card under it and as the account's own name, and the band it sits
 * in is the height the list insets its content by. Measured at the step the paper is set at: sixteen points of air,
 * twenty-three of type, twenty-five left under — which is the sixteen, twenty-three and twenty-four of the account
 * screen to within a point. At the largest step a reader can choose the type stands 28.75 and the band still holds it.
 */
const useStyles = createStyles(() => ({
  masthead: { paddingTop: SPACING.lg, paddingHorizontal: SPACING.lg },
}));

/**
 * What the reader kept of the paper, on a screen of its own.
 *
 * It lived on the front page for a while, as the second choice of a band above the sections — which is where the app
 * this one follows puts it, and where nothing else does. Then it was a screen pushed from the masthead of the front
 * page and from the account, which put the one collection a reader builds here two presses behind a menu, and out of
 * reach entirely from the wire and the search. It is a tab now, and it takes the place of the newsstand: what one
 * kept is somewhere one comes back to, and a shelf whose every cover opens a browser is not.
 *
 * It names itself the way the account screen beside it does, and it used to name itself the way a pushed screen does:
 * a bar across the top with the name set small and centred in it. That bar is the shape of a screen something opened
 * — the name shares the row with the way back out, which is what centres it — and nothing opens this one. Standing on
 * a tab it was a bar with a hole where the arrow goes, spending fifty-six points to repeat, in fourteen, the word the
 * bar at the bottom already prints in red and never takes away. Five tabs named themselves five different ways; two
 * of them had nothing better to print than their own name, and those two now print it identically.
 *
 * The name is handed to the list rather than laid above it, so it slides away as the reader goes down their shelf and
 * comes back as they return — the account's own name does that by being the first thing in a scrolling page, and a
 * name that stayed while the account's left would be the same word behaving two ways.
 *
 * The cards name the section they ran in, as they do everywhere articles from the whole paper are mixed: a shelf is
 * the one place where what was kept comes from anywhere at all.
 */
export function BookmarksPage(): ReactNode {
  const styles = useStyles();
  const kept = feedOf(useBookmarks((state) => state.kept));
  return (
    <Surface>
      <ArticleFeed
        feed={kept}
        rhythm="list"
        dated
        onOpen={(id) => {
          router.push(articleHref(id));
        }}
        action={(summary) => <BookmarkToggle summary={summary} />}
        header={
          <Box style={styles.masthead}>
            <Text variant="display" numberOfLines={1} heading>
              {t('bookmark.title')}
            </Text>
          </Box>
        }
        empty={{ title: t('bookmark.empty.title'), message: t('bookmark.empty.message') }}
      />
    </Surface>
  );
}
