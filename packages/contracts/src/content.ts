import { z } from 'zod';
import { DISPLAY_TEXT } from './display-text.ts';
import { SECTION_ID } from './ids.ts';

/**
 * Where a link leads: a page of the web, which the reader's browser opens. The journal's service links nowhere else
 * — an article it names in a body, it names by a slug that none of its routes takes — so an address of any other
 * kind is no link at all, and a reading that meets one keeps the words it wrapped.
 */
export const WEB_ADDRESS = z.url({ protocol: /^https?$/u });

/**
 * An inline run of text inside a paragraph or a quote. Every kind keeps its words under the one name, `text`: what
 * sets a run apart is how it is read — slanted, bold, or answering a press — and never where its words are kept, so
 * no reader of a sentence has to ask a run's kind before it can read what the run says.
 */
export const SPAN = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), text: DISPLAY_TEXT }),
  z.object({ type: z.literal('emphasis'), text: DISPLAY_TEXT }),
  z.object({ type: z.literal('strong'), text: DISPLAY_TEXT }),
  z.object({ type: z.literal('link'), text: DISPLAY_TEXT, url: WEB_ADDRESS }),
]);
export type Span = z.infer<typeof SPAN>;
/** The raw shape `SPAN` accepts as input, before it validates it. */
export type SpanInput = z.input<typeof SPAN>;

/**
 * A section of the newspaper: its id and the name the newsroom prints for it.
 *
 * Its place in the bar is its place in the list the source answers, and nothing else: the journal's menu comes in the
 * newsroom's order and says so by that order alone, and a number beside it would be a second order that could
 * disagree with the first.
 */
export const SECTION = z.object({
  id: SECTION_ID,
  label: DISPLAY_TEXT,
});
export type Section = z.infer<typeof SECTION>;
