import { NativeTabs } from 'expo-router/unstable-native-tabs';
import type { ReactNode } from 'react';
import { t } from '#i18n';

/** The native bottom tab bar: four destinations declared by route name, since a layout never imports a page. */
export function TabsLayout(): ReactNode {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('nav.headline')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="live">
        <NativeTabs.Trigger.Label>{t('nav.live')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="newsstand">
        <NativeTabs.Trigger.Label>{t('nav.newsstand')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>{t('nav.account')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
