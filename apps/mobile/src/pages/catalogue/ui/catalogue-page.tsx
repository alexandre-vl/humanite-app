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

/** The levels the catalogue lists, top down. */
const LEVELS: readonly CatalogLevel[] = ['L0', 'L1', 'L2', 'L3', 'L4'];

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
      <Scroll contentStyle={styles.content}>
        {LEVELS.map((level) => {
          const items = REGISTRY.filter((item) => item.level === level);
          if (items.length === 0) {
            return null;
          }
          return (
            <Box key={level} style={styles.section}>
              <Text>{asDisplayText(level)}</Text>
              {items.map((item) => (
                <Box key={item.entry.name} style={styles.entry}>
                  <Text>{item.entry.name}</Text>
                  {item.entry.render()}
                </Box>
              ))}
            </Box>
          );
        })}
      </Scroll>
    </Surface>
  );
}
