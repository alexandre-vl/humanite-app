/**
 * What a phone answers about the app, read into numbers.
 *
 * Every reader here refuses what it does not recognise rather than returning a zero. An unread answer that came back
 * as a number would be a budget met by an instrument that saw nothing — the one failure a measurement must never be
 * able to produce, since nobody would go looking for it. The shapes below are Android's documented ones; the day a
 * version changes one, the refusal says so and carries the text it was handed, instead of reporting a fast app.
 */

/** A number read from an answer, or the answer that could not be read. */
export type Read<Value> =
  Readonly<{ read: 'answered'; value: Value }> | Readonly<{ read: 'unreadable'; wanted: string; saw: string }>;

const answered = <Value>(value: Value): Read<Value> => ({ read: 'answered', value });

/** The first capture group of `pattern` in `text`, as a number; `null` when the pattern does not match. */
const numberAt = (text: string, pattern: RegExp): number | null => {
  const found = pattern.exec(text);
  const digits = found?.[1];
  return digits === undefined ? null : Number(digits);
};

/** The answer, trimmed to what fits a diagnostic: enough to recognise, never the whole dump. */
const gist = (output: string): string => {
  const trimmed = output.trim();
  return trimmed.length <= 200 ? trimmed : `${trimmed.slice(0, 200)}…`;
};

/** How long a cold launch took to its first frame, as `am start -W` reports it. */
export type Startup = Readonly<{ totalMs: number }>;

/**
 * Reads `adb shell am start -W`. `TotalTime` is the one line every Android since 5 prints and the one that answers
 * the question: the whole launch, from the intent to the first frame of the activity. `ThisTime` is left alone — it
 * counts the last activity of a chain, which for one activity is the same number said twice, and which recent Android
 * has stopped printing at all.
 */
export function startupOf(output: string): Read<Startup> {
  const totalMs = numberAt(output, /^\s*TotalTime:\s*(\d+)\s*$/mu);
  return totalMs === null
    ? { read: 'unreadable', wanted: 'une ligne TotalTime', saw: gist(output) }
    : answered({ totalMs });
}

/** What the app's own rendering did over the frames the phone kept. */
export type Frames = Readonly<{ rendered: number; janky: number; jankyPercent: number }>;

/**
 * Reads `adb shell dumpsys gfxinfo <package>`. Since Android 12 a frame counts as janky against the deadline the
 * screen actually ran at, so the percentage answers the budget at sixty, ninety or a hundred and twenty hertz without
 * being told which. A dump of zero frames is refused: it is what a package that never drew answers, and a budget met
 * because nothing was rendered is not a budget met.
 */
export function framesOf(output: string): Read<Frames> {
  const rendered = numberAt(output, /^\s*Total frames rendered:\s*(\d+)\s*$/mu);
  const janky = numberAt(output, /^\s*Janky frames:\s*(\d+)\s*\(/mu);
  if (rendered === null || janky === null) {
    return { read: 'unreadable', wanted: 'les lignes Total frames rendered et Janky frames', saw: gist(output) };
  }
  if (rendered === 0) {
    return { read: 'unreadable', wanted: 'des images rendues', saw: gist(output) };
  }
  return answered({ rendered, janky, jankyPercent: (janky / rendered) * 100 });
}

/** How fast the screen the measurement was taken on refreshes. */
export type Display = Readonly<{ hz: number }>;

/**
 * Reads `adb shell dumpsys display` for the rate the panel is running at. It answers no budget of its own — the jank
 * count already holds the deadline — and is recorded because a reading taken at sixty hertz and one taken at a
 * hundred and twenty are not the same reading, whatever their percentages agree on. Several modes are listed; the
 * fastest is the one a phone left alone will reach.
 */
export function displayOf(output: string): Read<Display> {
  const rates = [...output.matchAll(/(\d+(?:\.\d+)?)\s*fps/gu)].map((found) => Number(found[1]));
  const fastest = rates.reduce((highest, rate) => (rate > highest ? rate : highest), 0);
  return fastest === 0
    ? { read: 'unreadable', wanted: 'un mode en fps', saw: gist(output) }
    : answered({ hz: fastest });
}

/** What the phone and the build under measurement are, as far as a budget is concerned. */
export type Provenance = Readonly<{ emulated: boolean; debuggable: boolean; model: string }>;

/**
 * Reads what `getprop` and `dumpsys package` say about where a measurement is being taken.
 *
 * Two things disqualify a reading before any number is looked at. An emulator renders in software and answers about a
 * machine no reader holds. A debuggable build carries the development bridge, keeps its bundle on a server and skips
 * the shrinking a shipped one gets — it is a different program. Neither refusal is a matter of degree, which is why
 * they are read here rather than remembered by whoever ran the commands.
 */
export function provenanceOf(props: string, packageDump: string): Read<Provenance> {
  const model = /^\[ro\.product\.model\]:\s*\[(.*)\]\s*$/mu.exec(props)?.[1];
  if (model === undefined) {
    return { read: 'unreadable', wanted: 'une propriété ro.product.model', saw: gist(props) };
  }
  const characteristics = /^\[ro\.build\.characteristics\]:\s*\[(.*)\]\s*$/mu.exec(props)?.[1] ?? '';
  const qemu = /^\[ro\.kernel\.qemu\]:\s*\[1\]\s*$/mu.test(props);
  return answered({
    model,
    emulated: qemu || characteristics.split(',').includes('emulator') || /redroid/iu.test(model),
    debuggable: /\bDEBUGGABLE\b/u.test(packageDump),
  });
}
