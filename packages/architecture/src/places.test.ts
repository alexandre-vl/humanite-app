import { describe, expect, expectTypeOf, test } from 'vitest';
import { HERMES_FILES, packageImports } from './app.ts';
import type { Importable, Place } from './places.ts';
import { IMPORTS, ORDER, PLACE_NAMES, PLACES } from './places.ts';

const rankOf = (place: Place): number => ORDER.findIndex((group) => group.some((member) => member === place));

describe('the places of the app', () => {
  test('every import goes down the order, or across the shared kernel', () => {
    const upward = PLACE_NAMES.flatMap((importer) =>
      IMPORTS[importer]
        .filter(
          (imported) =>
            rankOf(imported) < rankOf(importer) ||
            (rankOf(imported) === rankOf(importer) && rankOf(importer) !== ORDER.length - 1),
        )
        .map((imported) => `${importer} → ${imported}`),
    );
    expect(upward).toEqual([]);
  });

  test('an upward edge in the table does not compile', () => {
    expectTypeOf<'page'>().not.toExtend<Importable<'primitive'>>();
    expectTypeOf<'lib'>().toExtend<Importable<'config'>>();
    // @ts-expect-error -- a primitive importing a page is an upward edge
    const upward: readonly Importable<'primitive'>[] = ['page'];
    expect(upward).toHaveLength(1);
  });

  test('the kernel imports itself without cycles between distinct places', () => {
    const edges = PLACE_NAMES.flatMap((importer) =>
      IMPORTS[importer].filter((imported) => imported !== importer).map((imported) => [importer, imported] as const),
    );
    const reaches = (from: Place, to: Place, seen: ReadonlySet<Place> = new Set()): boolean =>
      edges.some(
        ([start, end]) => start === from && !seen.has(end) && (end === to || reaches(end, to, new Set([...seen, end]))),
      );
    expect(PLACE_NAMES.filter((place) => reaches(place, place))).toEqual([]);
  });

  test('aliases and directories are unique', () => {
    const aliases = PLACE_NAMES.flatMap((place) => {
      const { alias } = PLACES[place];
      return alias === null ? [] : [alias];
    });
    expect(new Set(aliases).size).toBe(aliases.length);
    const directories = PLACE_NAMES.map((place) => PLACES[place].directory);
    expect(new Set(directories).size).toBe(directories.length);
  });
});

describe('what the tools derive from the places', () => {
  test('package imports point at public entries only', () => {
    expect(packageImports()).toEqual({
      '#app': './src/_app/index.ts',
      '#pages/*': './src/pages/*/index.ts',
      '#features/*': './src/features/*/index.ts',
      '#entities/*': './src/entities/*/index.ts',
      '#components/*': './src/shared/ui/components/*/index.ts',
      '#primitives/*': './src/shared/ui/primitives/*/index.ts',
      '#lib/*': './src/shared/lib/*/index.ts',
      '#i18n': './src/shared/i18n/index.ts',
      '#config': './src/shared/config/index.ts',
      '#api': './src/shared/api/index.ts',
    });
  });

  test('Hermes runs the routes and the layers of src', () => {
    expect(HERMES_FILES).toEqual(['apps/mobile/app/**/*.{ts,tsx}', 'apps/mobile/src/**/*.{ts,tsx}']);
  });
});
