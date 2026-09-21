import { NativeTabs } from 'expo-router/unstable-native-tabs';
import type { ReactNode } from 'react';
import { t } from '#i18n';
import { chromeStyle, useTheme } from '#lib/styles';
import { ICONS } from '#primitives/icon';

/**
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
      <NativeTabs.Trigger name="newsstand">
        <NativeTabs.Trigger.Icon sf={ICONS.newsstand.ios} md={ICONS.newsstand.android} />
        <NativeTabs.Trigger.Label>{t('nav.newsstand')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Icon sf={ICONS.account.ios} md={ICONS.account.android} />
        <NativeTabs.Trigger.Label>{t('nav.account')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
