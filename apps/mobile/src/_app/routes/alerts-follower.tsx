import { useIsRestoring } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ALERTS } from '#api';
import { articleHref, openExternal } from '#lib/routing';
import { destinationOf } from '../model/alerts';
import { queryClient } from '../model/query-client';

/**
 * Takes the reader where each alert they touch points (ADR-0043).
 *
 * It listens from the moment it is mounted, which is the moment it can act on what it hears: the gate mounts it with
 * the stack of screens, once the faces are in, so an article pushed from here has a stack to go on. It also waits for
 * the cache to be back from the disk, which is where an article already read is found without asking the journal.
 * A touch that came before — the one that opened the app — is kept by the alerts until this first listens.
 *
 * It draws nothing: it is the one part of the app that is told of a touch, and it only moves the reader.
 */
export function AlertsFollower(): null {
  const restoring = useIsRestoring();
  useEffect(() => {
    if (restoring) {
      return undefined;
    }
    return ALERTS.onOpen((address) => {
      void destinationOf(queryClient, address).then((destination) => {
        if (destination.kind === 'article') {
          router.push(articleHref(destination.id));
        } else {
          openExternal(destination.address);
        }
      });
    });
  }, [restoring]);
  return null;
}
