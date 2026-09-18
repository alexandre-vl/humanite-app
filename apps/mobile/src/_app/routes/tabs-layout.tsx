import { NativeTabs } from 'expo-router/unstable-native-tabs';
import type { ReactNode } from 'react';
import { t } from '#i18n';

/** The native bottom tab bar: four destinations declared by route name, since a layout never imports a page. Each carries an icon — an SF Symbol on iOS, a Material Symbol on Android — so the bar shows every tab, not only the active label. */
export function TabsLayout(): ReactNode {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="house" md="home" />
        <NativeTabs.Trigger.Label>{t('nav.headline')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="live">
        <NativeTabs.Trigger.Icon sf="bolt" md="bolt" />
        <NativeTabs.Trigger.Label>{t('nav.live')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="newsstand">
        <NativeTabs.Trigger.Icon sf="newspaper" md="newspaper" />
        <NativeTabs.Trigger.Label>{t('nav.newsstand')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Icon sf="person" md="person" />
        <NativeTabs.Trigger.Label>{t('nav.account')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
