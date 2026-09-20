import type { BudgetId } from './budgets.ts';
import { BUDGETS } from './budgets.ts';
import { displayOf, framesOf, provenanceOf, startupOf } from './android.ts';

/**
 * What a run of the budgets can report. Written out rather than derived from a list: nothing ever walks these codes,
 * and the fixtures that must reach every one of them are held to it by the bench's own exhaustiveness.
 */
export type PerfCode =
  | 'perf/emulator-refused'
  | 'perf/debuggable-refused'
  | 'perf/unreadable-provenance'
  | 'perf/unreadable-startup'
  | 'perf/unreadable-frames'
  | 'perf/unreadable-display'
  | 'perf/cold-start-exceeded'
  | 'perf/scroll-jank-exceeded';

/** Everything a phone answered in one session, exactly as it answered it. */
export type Answers = Readonly<{
  /** What `getprop` printed. */
  props: string;
  /** What `dumpsys package <package>` printed. */
  build: string;
  /** What `am start -W` printed. */
  startup: string;
  /** What `dumpsys gfxinfo <package>` printed, after a reset and thirty seconds of scrolling. */
  frames: string;
  /** What `dumpsys display` printed. */
  display: string;
}>;

type Finding = Readonly<{ code: PerfCode; detail: string }>;

/** What one budget was measured at, once the answer it is read from could be read. */
type Measure = Readonly<{ budget: BudgetId; value: number; limit: number; within: boolean }>;

export type Report = Readonly<{
  findings: readonly Finding[];
  measures: readonly Measure[];
  /** The rate the screen ran at, when it could be read: the same percentage means different things at 60 and at 120. */
  hz: number | null;
}>;

const measured = (budget: BudgetId, value: number): Measure => {
  const { limit } = BUDGETS[budget];
  return { budget, value, limit, within: value <= limit };
};

const rounded = (value: number): string => (Math.round(value * 100) / 100).toString();

/**
 * Reads a session against the budgets.
 *
 * A budget whose answer could not be read reports that and nothing else: it is neither met nor missed, and calling it
 * either would be an opinion about a phone that said something the tool did not understand. A budget that was read
 * and exceeded reports the number and the line it crossed, so the journal of the session carries the fact rather than
 * the verdict alone.
 */
export function judge(answers: Answers): Report {
  const findings: Finding[] = [];
  const measures: Measure[] = [];

  const provenance = provenanceOf(answers.props, answers.build);
  if (provenance.read === 'unreadable') {
    findings.push({
      code: 'perf/unreadable-provenance',
      detail: `${provenance.wanted} attendue ; reçu : ${provenance.saw}`,
    });
  } else {
    if (provenance.value.emulated) {
      findings.push({
        code: 'perf/emulator-refused',
        detail: `« ${provenance.value.model} » rend en logiciel : un budget se mesure sur un téléphone`,
      });
    }
    if (provenance.value.debuggable) {
      findings.push({
        code: 'perf/debuggable-refused',
        detail: 'le paquet mesuré est debuggable : ce n’est pas le programme qu’un lecteur installe',
      });
    }
  }

  const startup = startupOf(answers.startup);
  if (startup.read === 'unreadable') {
    findings.push({ code: 'perf/unreadable-startup', detail: `${startup.wanted} attendue ; reçu : ${startup.saw}` });
  } else {
    const measure = measured('cold-start', startup.value.totalMs);
    measures.push(measure);
    if (!measure.within) {
      findings.push({
        code: 'perf/cold-start-exceeded',
        detail: `${rounded(measure.value)} ms au lancement à froid, ${rounded(measure.limit)} ms au plus`,
      });
    }
  }

  const frames = framesOf(answers.frames);
  if (frames.read === 'unreadable') {
    findings.push({ code: 'perf/unreadable-frames', detail: `${frames.wanted} attendues ; reçu : ${frames.saw}` });
  } else {
    const measure = measured('scroll-jank', frames.value.jankyPercent);
    measures.push(measure);
    if (!measure.within) {
      findings.push({
        code: 'perf/scroll-jank-exceeded',
        detail: `${rounded(measure.value)} % des ${String(frames.value.rendered)} images hors échéance, ${rounded(measure.limit)} % au plus`,
      });
    }
  }

  const display = displayOf(answers.display);
  if (display.read === 'unreadable') {
    findings.push({ code: 'perf/unreadable-display', detail: `${display.wanted} attendu ; reçu : ${display.saw}` });
  }

  return { findings, measures, hz: display.read === 'answered' ? display.value.hz : null };
}
