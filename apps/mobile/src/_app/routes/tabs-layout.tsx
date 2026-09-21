import { NativeTabs } from 'expo-router/unstable-native-tabs';
import type { ReactNode } from 'react';
import { t } from '#i18n';
import { chromeStyle, useTheme } from '#lib/styles';
import { ICONS } from '#primitives/icon';

/**
 * The bar holds what a reader comes back to, and the newsstand is not that any more. Taking a numéro off its shelf
 * opens the paper on the web, so a fifth of the app's own navigation led out of the app; and what the reader keeps —
 * the one collection in here they make themselves — was not in the bar at all, reachable only from the masthead of
 * the front page or two rows into the account. From the wire, the search and the newsstand there was no way to it.
 * The app this one replaces put FAVORIS in the band above both the front page and the wire (docs/app-actuelle,
 * README:43), so burying it was a step back from the thing being replaced. They have swapped places: the shelf is
 * pushed from the account, where the paper's own business is, and what one kept has a tab.
 *
 * The native bottom tab bar: five destinations declared by route name, since a layout never imports a page. Each
 * carries an icon — an SF Symbol on iOS, a Material Symbol on Android — so the bar shows every tab, not only the
 * active label. The symbols are read from the icon registry rather than written here: the navigator draws them itself,
 * but what an icon is called has one place to be decided, and the label beside it is read from the dictionary the
 * same way.
 *
 * Every tab is named, and that is not the default. Material's navigation bar labels only the selected item once it
 * carries more than three, which this one does: measured on an A065, the bar held one `TextView` — `En continu`, at
 * `[245,2265][403,2307]` — and four destinations drawn as a symbol and nothing else. A house, a magnifying glass and
 * a person are guessable; a folded newspaper standing for the newsstand is not, and the reference document already
 * lists an unlabelled control among the frictions of the app this one replaces. Material's own accessibility note on
 * the component says to set the labels on, which is what this does.
 *
 * `minimizeBehavior` is the one place the bar is allowed to get out of the way, and it is the platform's own doing:
 * from iOS 26 the tab bar shrinks to a pill as the reader goes down a screen and comes back as they go up. It is
 * ignored everywhere else, and nothing here hides the bar by hand — Material's navigation bar is persistent, and a
 * reader who cannot see where they are is not being given room, they are being given a guess.
 */
export function TabsLayout(): ReactNode {
  const theme = useTheme();
  return (
    <NativeTabs
      backgroundColor={theme.surface}
      tintColor={theme.primary}
      iconColor={theme.textMuted}
      indicatorColor={theme.card}
      rippleColor={theme.border}
      labelVisibilityMode="labeled"
      minimizeBehavior="onScrollDown"
      labelStyle={chromeStyle('textMuted', theme)}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={ICONS.headline.ios} md={ICONS.headline.android} />
        <NativeTabs.Trigger.Label>{t('nav.headline')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="live">
        <NativeTabs.Trigger.Icon sf={ICONS.live.ios} md={ICONS.live.android} />
        <NativeTabs.Trigger.Label>{t('nav.live')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search">
        <NativeTabs.Trigger.Icon sf={ICONS.search.ios} md={ICONS.search.android} />
        <NativeTabs.Trigger.Label>{t('nav.search')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      {/* Named from the screen's own title rather than from a `nav.` key of its own: every other tab names a screen
          that is called nothing anywhere else, and this one has a bar across its top already saying what it is. */}
      <NativeTabs.Trigger name="bookmarks">
        <NativeTabs.Trigger.Icon sf={ICONS.bookmark.ios} md={ICONS.bookmark.android} />
        <NativeTabs.Trigger.Label>{t('bookmark.title')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Icon sf={ICONS.account.ios} md={ICONS.account.android} />
        <NativeTabs.Trigger.Label>{t('nav.account')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
