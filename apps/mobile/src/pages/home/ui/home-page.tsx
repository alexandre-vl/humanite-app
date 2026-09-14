import type { ReactNode } from 'react';
import { Surface } from '#shared/ui/primitives/surface';
import { Text } from '#shared/ui/primitives/text';

export function HomePage(): ReactNode {
  return (
    <Surface>
      <Text>Humanité</Text>
    </Surface>
  );
}
