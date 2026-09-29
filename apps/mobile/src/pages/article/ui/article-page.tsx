import { ARTICLE_ID } from '@huma/contracts';
import { useQuery } from '@tanstack/react-query';
import { Link, router } from 'expo-router';
import type { ReactNode } from 'react';
import { TopBar } from '#components/top-bar';
import type { FigureLinkProps } from '#entities/article';
import { ArticleReader, FigureLinkContext, articleQuery, readsDark, useReadSummary } from '#entities/article';
import { BookmarkToggle, useBookmarks } from '#features/bookmark';
import { useReaderSession } from '#features/sign-in';
import { useViewingPicture } from '#features/view-picture';
import { t } from '#i18n';
import { openExternal, PICTURE_HREF, SIGN_IN_HREF, useRouteParams } from '#lib/routing';
import { Box } from '#primitives/box';
import { Pressable } from '#primitives/pressable';
import { Surface } from '#primitives/surface';
import { ThemeScope } from '#primitives/theme';

function pictureLink({ figure, children }: FigureLinkProps): ReactNode {
  return (
    <Link
      href={PICTURE_HREF}
      asChild
      onPress={() => {
        useViewingPicture.getState().open(figure);
      }}
    >
      <Pressable role="button" label={t('picture.open')}>
        <Link.AppleZoom>
          <Box>{children}</Box>
        </Link.AppleZoom>
      </Pressable>
    </Link>
  );
}

/**
 * One article, read whole, full screen.
 *
 * The parameter is parsed rather than read: an `ArticleId` is a branded string only the contract's parser mints, so a
 * link whose value is not shaped like one never reaches the content, and one that is shaped like one but names no
 * article comes back as the failure that says so, with nothing to try again: asking twice would not make it one.
 *
 * The route is pushed at the root of the stack rather than inside the tabs, so reading covers the tab bar — which is
 * what the current app does, and what the reference calls for: `Article — plein écran, retour ‹, sans barre du bas`.
 * The bar across the top carries the way back and no name: an article's own headline is already the first thing
 * under it, and repeating it in a bar would say it twice.
 *
 * Keeping the article is offered from that same bar, opposite the chevron. The screen this copies puts the mark in
 * the flow of the text, where it scrolls out of reach of a reader who has read down to the end and decided: the two
 * things one does to an article one is reading — leave it, keep it — belong together and stay. The mark appears with
 * the article, which is what it keeps: the reader below asks for it, and this screen reads the same answer.
 *
 * A link inside the body leaves the app, and so does the film of a video: the journal links nowhere but the open web,
 * and the screen is where that is decided — the article knows it is sending a reader somewhere, never where.
 *
 * A video is read on the dark page, from the status bar down, whatever the reader's theme: the ground belongs to what
 * is read, as the current app prints its videos. The whole screen is scoped — its bar and the inset over it included —
 * where only the reading was, which left a white bar over a black page. The scope stands whether or not it names a
 * theme, so the screen is not built again when the article arrives and turns out to be a film.
 *
 * Which theme it names is read from everything the app holds and not from the article alone. What an item is comes
 * with the card the reader touched — the format is a field of a summary — so the page can open dark. Read from the
 * article, it could only turn dark once the service had answered: measured on the phone on 25/09/2026, a video opened
 * white, was read on white for 850 ms with its head, its standfirst and its signature already printed, and went black
 * under the reader at the moment its body landed.
 */
export function ArticlePage(): ReactNode {
  const id = useRouteParams((raw) => ARTICLE_ID.parse(raw['id']));
  const article = useQuery(articleQuery(id)).data;
  // Everything the app already holds of this article, from either place it could be holding it: a list it has read,
  // or the reader's own shelf. Both answer a summary, which is an article without its body, so either lets the head
  // of the page be drawn before the service has said anything. A link opened from outside reaches neither, and the
  // screen stands in for the whole of itself, as it did before.
  const read = useReadSummary(id);
  const kept = useBookmarks((state) => state.kept.find((each) => each.id === id) ?? null);
  const known = article ?? read ?? kept;
  // A wall offers the way back in only when there is one to offer: a build given the journal's key, and a reader not
  // already signed in — for whom a wall is the journal withholding this piece, and not a connection to open.
  const { offered, connection } = useReaderSession();
  return (
    <ThemeScope name={known !== null && readsDark(known.format) ? 'dark' : null} screen>
      <Surface>
        <TopBar
          onBack={() => {
            router.back();
          }}
          // Drawn from whatever is known rather than from the article alone: the mark used to be missing from the
          // bar and to appear in it a moment later, on a page whose headline was already there to be kept.
          action={known === null ? null : <BookmarkToggle summary={known} />}
        />
        <FigureLinkContext value={pictureLink}>
          <ArticleReader
            id={id}
            known={read ?? kept}
            onFollow={openExternal}
            onSignIn={
              offered && connection === 'out'
                ? () => {
                    router.push(SIGN_IN_HREF);
                  }
                : null
            }
          />
        </FigureLinkContext>
      </Surface>
    </ThemeScope>
  );
}
