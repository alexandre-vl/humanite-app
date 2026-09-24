import { RADII, SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { CatalogEntry } from '../../../lib/catalogue';
import { asDisplayText } from '../../../lib/display-text';
import { createStyles } from '../../../lib/styles';
import { Curtain } from './curtain';

const useStyles = createStyles((theme) => ({
  stage: { width: SPACING.xxxl, height: SPACING.xxxl },
  under: { flex: 1, borderRadius: RADII.md, backgroundColor: theme.primary },
  over: {
    position: 'absolute',
    top: SPACING.none,
    bottom: SPACING.none,
    left: SPACING.none,
    right: SPACING.none,
    borderRadius: RADII.md,
    backgroundColor: theme.card,
  },
}));

function CurtainDemo(): ReactNode {
  const styles = useStyles();
  const [lifted, setLifted] = useState(false);
  return (
    <Pressable
      onPress={() => {
        setLifted(true);
      }}
    >
      <View style={styles.stage}>
        <View style={styles.under} />
        <Curtain style={styles.over} lifted={lifted}>
          <Text> </Text>
        </Curtain>
      </View>
    </Pressable>
  );
}

export const catalog: CatalogEntry = {
  name: asDisplayText('Curtain'),
  render: () => <CurtainDemo />,
};
