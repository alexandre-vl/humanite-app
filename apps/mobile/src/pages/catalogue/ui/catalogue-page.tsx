import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import type { CatalogLevel } from '#lib/catalogue';
import { asDisplayText } from '#lib/display-text';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Scroll } from '#primitives/scroll';
import { Surface } from '#primitives/surface';
import { Text } from '#primitives/text';
import { REGISTRY } from '../model/registry';

/**
 * The levels the catalogue lists, top down: those the registry holds, and no other. Listing them by hand would be a
 * second source beside the levels the architecture assigns each place, which the generated registry already carries —
 * and a level nothing lives in would print an empty heading.
 */
const LEVELS: readonly CatalogLevel[] = [...new Set(REGISTRY.map((item) => item.level))].sort((left, right) =>
  left.localeCompare(right),
);

const useStyles = createStyles(() => ({
  content: { padding: SPACING.lg, gap: SPACING.xl },
  section: { gap: SPACING.md },
  entry: { gap: SPACING.xs },
}));

/** A running gallery of every catalogued primitive and component, grouped by level. */
export function CataloguePage(): ReactNode {
  const styles = useStyles();
  return (
    <Surface>
      <Scroll axis="vertical" contentStyle={styles.content}>
        {LEVELS.map((level) => (
          <Box key={level} style={styles.section}>
            <Text>{asDisplayText(level)}</Text>
            {REGISTRY.filter((item) => item.level === level).map((item) => (
              <Box key={item.entry.name} style={styles.entry}>
                <Text>{item.entry.name}</Text>
                {item.entry.render()}
              </Box>
            ))}
          </Box>
        ))}
      </Scroll>
    </Surface>
  );
}
