import type { ArticleSummary, Question } from '@huma/contracts';
import { QUESTION } from '@huma/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { summariesMatching } from '../api/queries';

/**
 * How short a question may be and still be one. A single letter reaches nearly every article and an empty field every
 * one, there being nothing to match against; two letters is where an answer starts saying something. The contract asks
 * for none, so the rule is the app's.
 */
const SHORTEST = 2;

/**
 * The question a reader's words put to the content, or none while they say too little to be one. It is read here once,
 * where the words were typed — trimmed by the contract's own schema — and both the query that asks it and the screen
 * that shows the answer read this, so the two cannot disagree about whether there was a question.
 */
export const questionOf = (words: string): Question | null => {
  const asked = QUESTION.safeParse(words);
  return asked.success && asked.data.length >= SHORTEST ? asked.data : null;
};

/**
 * What the app can answer about a question from the lists it has already read, while the journal answers the rest.
 *
 * Recomputed when the question changes and not on every render: it walks every summary in the cache, which is a few
 * dozen and costs nothing, but doing it four times for one keystroke would be four times nothing for no reason.
 */
export const useReadMatches = (question: Question | null): readonly ArticleSummary[] => {
  const cache = useQueryClient();
  return useMemo(() => (question === null ? [] : summariesMatching(cache, question)), [cache, question]);
};
