import type { SectionId } from '@huma/contracts';
import { SPACING } from '@huma/design-tokens';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createStyles } from '#lib/styles';
import { Box } from '#primitives/box';
import { Pressable } from '#primitives/pressable';
import { Scroll } from '#primitives/scroll';
import { Text } from '#primitives/text';
import { sectionsQuery } from '../api/queries';

export type SectionBarProps = Readonly<{ active?: SectionId; onSelect: (section: SectionId) => void }>;

const useStyles = createStyles((theme) => ({
  bar: { flex: 1, backgroundColor: theme.surface },
  labels: { alignItems: 'flex-end', paddingHorizontal: SPACING.sm },
  label: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  // The rule under a section is drawn whether or not it is the one showing, in the ground's own colour when it is not:
  // a rule that appeared would push every label up by its own height the moment a section was chosen.
  rule: { height: SPACING.xs, backgroundColor: theme.surface },
  ruleActive: { height: SPACING.xs, backgroundColor: theme.primary },
}));

/**
 * The sections, as a band that scrolls across the screen. It names the one showing with a rule under its label and
 * reports a tap; it does not navigate, so the screen that holds it decides whether choosing a section opens one or
 * replaces the one being read.
 */
export function SectionBar({ active, onSelect }: SectionBarProps): ReactNode {
  const styles = useStyles();
  const { data } = useQuery(sectionsQuery);
  // `.sort` rather than `.toSorted`, which Hermes V1 lacks; the copy keeps the cached array untouched.
  const sections = [...(data ?? [])].sort((left, right) => left.order - right.order);
  return (
    <Scroll axis="horizontal" style={styles.bar} contentStyle={styles.labels}>
      {sections.map((section) => (
        <Pressable
          key={section.id}
          style={styles.label}
          onPress={() => {
            onSelect(section.id);
          }}
        >
          <Text variant="label">{section.label}</Text>
          <Box style={styles[section.id === active ? 'ruleActive' : 'rule']} />
        </Pressable>
      ))}
    </Scroll>
  );
}
