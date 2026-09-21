import type { DisplayText } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import type { ReactNode } from 'react';
import { Button } from '#components/button';
import { Paper } from '#components/paper';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Text } from '#primitives/text';

export type ArticleCalloutProps = Readonly<{
  title: DisplayText;
  text: DisplayText;
  button: DisplayText;
  onPress: () => void;
}>;

const useStyles = createStyles(() => ({
  block: { paddingHorizontal: SPACING.xl },
  action: { alignItems: 'flex-start', paddingTop: SPACING.xs },
}));

/**
 * The call for support an article carries, on a piece of paper like the linked card, and narrower than the column —
 * measured on capture 16 at 903 points against the column's 1006.
 *
 * It carries its button, and the button answers. The capture shows none, and the reference document lists that as a
 * fault: an appeal with nothing to press is an appeal that cannot be answered. The contract has carried the button's
 * words all along; where pressing it leads is the screen's to say, an entity naming neither a route nor an address.
 */
export function ArticleCallout({ title, text, button, onPress }: ArticleCalloutProps): ReactNode {
  const styles = useStyles();
  return (
    <Box style={styles.block}>
      <Paper>
        {/* An appeal, set as the title of an appeal. It was set as a headline — an article's own type, in an article's
            own red — so the loudest line of a piece was the call for support printed in the middle of it. */}
        <Text variant="title" heading>
          {title}
        </Text>
        <Text variant="prose">{text}</Text>
        <Box style={styles.action}>
          <Button label={button} onPress={onPress} />
        </Box>
      </Paper>
    </Box>
  );
}
