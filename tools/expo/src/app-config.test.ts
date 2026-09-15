import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readWorkspace } from '@huma/deps/workspace';
import { findWorkspaceRoot } from '@huma/kit/cli';
import { expect, test } from 'vitest';
import { expoRouterApps } from './apps.ts';

/** A nested field of a config object, read without trusting its shape: `undefined` as soon as a step is not an object. */
const field = (value: unknown, ...keys: readonly string[]): unknown =>
  keys.reduce<unknown>(
    (current, key) => (typeof current === 'object' && current !== null ? Reflect.get(current, key) : undefined),
    value,
  );

/**
 * app.config.ts is typed as ExpoConfig, but that type leaves every load-bearing choice optional: the invariants below
 * each carry weight the type cannot — the dev client deep link needs a scheme, the emulator install and the Maestro
 * runs need one application id, typed routes are a source of truth, the React Compiler a build guarantee, and RN 0.86
 * closes the app on a system back unless the predictive gesture stays off (journal 0a, vérification 19). Nothing else
 * proves them, so a silent edit would only surface on a device.
 */
test('every Expo app keeps the config invariants its build and dev client depend on', async () => {
  const root = await findWorkspaceRoot(import.meta.dirname);
  const apps = expoRouterApps(await readWorkspace(root));
  expect(apps.length).toBeGreaterThan(0);
  for (const app of apps) {
    const module: unknown = await import(pathToFileURL(join(root, app, 'app.config.ts')).href);
    const config = field(module, 'default');
    expect({
      app,
      scheme: typeof field(config, 'scheme') === 'string' && field(config, 'scheme') !== '',
      sameApplicationId: field(config, 'ios', 'bundleIdentifier') === field(config, 'android', 'package'),
      predictiveBack: field(config, 'android', 'predictiveBackGestureEnabled'),
      typedRoutes: field(config, 'experiments', 'typedRoutes'),
      reactCompiler: field(config, 'experiments', 'reactCompiler'),
      updates: field(config, 'updates', 'enabled'),
    }).toEqual({
      app,
      scheme: true,
      sameApplicationId: true,
      predictiveBack: false,
      typedRoutes: true,
      reactCompiler: true,
      updates: false,
    });
  }
});
