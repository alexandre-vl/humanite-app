import type { ErrorBoundaryProps } from 'expo-router';
import type { ReactNode } from 'react';
import { Surface } from '#shared/ui/primitives/surface';
import { Text } from '#shared/ui/primitives/text';

export function ErrorBoundary({ error }: ErrorBoundaryProps): ReactNode {
  return (
    <Surface>
      <Text>{error.message}</Text>
    </Surface>
  );
}
