import type { SectionId } from '@huma/contracts';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { LabelBar } from '#components/label-bar';
import type { LabelBarItem } from '#components/label-bar';
import { sectionsQuery } from '../api/queries';

export type SectionBarProps = Readonly<{ active?: SectionId | undefined; onSelect: (section: SectionId) => void }>;

/**
 * The sections, as a band across the screen. It names the one showing and reports a tap; it does not navigate, so the
 * screen that holds it decides whether choosing a section opens one or replaces the one being read.
 *
 * What it knows that the band does not is the newsroom's order: the sections come back under their own numbering, and
 * a paper whose sections rearranged themselves by the order a cache answered in would not be the same paper twice.
 */
export function SectionBar({ active, onSelect }: SectionBarProps): ReactNode {
  const { data } = useQuery(sectionsQuery);
  // `.sort` rather than `.toSorted`, which Hermes V1 lacks; the copy keeps the cached array untouched.
  const ordered = [...(data ?? [])].sort((left, right) => left.order - right.order);
  const items: readonly LabelBarItem<SectionId>[] = ordered.map((section) => ({
    id: section.id,
    label: section.label,
  }));
  return <LabelBar items={items} active={active} onSelect={onSelect} />;
}
