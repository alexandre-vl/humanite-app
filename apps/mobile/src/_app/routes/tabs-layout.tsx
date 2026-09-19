import { NativeTabs } from 'expo-router/unstable-native-tabs';
import type { ReactNode } from 'react';
import { t } from '#i18n';
import { useTheme } from '#lib/styles';
import { ICONS } from '#primitives/icon';

/**
 * The native bottom tab bar: four destinations declared by route name, since a layout never imports a page. Each
 * carries an icon — an SF Symbol on iOS, a Material Symbol on Android — so the bar shows every tab, not only the
 * active label. The symbols are read from the icon registry rather than written here: the navigator draws them itself,
 * but what an icon is called has one place to be decided, and the label beside it is read from the dictionary the
 * same way.
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
      labelStyle={{ color: theme.textMuted }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={ICONS.headline.ios} md={ICONS.headline.android} />
        <NativeTabs.Trigger.Label>{t('nav.headline')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="live">
        <NativeTabs.Trigger.Icon sf={ICONS.live.ios} md={ICONS.live.android} />
        <NativeTabs.Trigger.Label>{t('nav.live')}</NativeTabs.Trigger.Label>
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
