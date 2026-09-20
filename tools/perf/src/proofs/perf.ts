import { fixtureFactory } from '@huma/fixtures';
import type { Answers, PerfCode } from '../check.ts';
import { judge } from '../check.ts';

const define = fixtureFactory<PerfCode>();

/**
 * Answers in the shapes Android prints them, written here rather than captured from a phone: what a fixture proves is
 * the verdict, and a verdict is proven by handing the reader an answer whose right reading is known in advance. The
 * phone is what the numbers come from, and no fixture can stand in for that — it stands in for the reading of them,
 * which is the half that can be wrong in silence.
 */
const LAUNCH = (totalMs: number): string => `Starting: Intent { act=android.intent.action.MAIN flg=0x10200000 }
Status: ok
LaunchState: COLD
Activity: dev.humanite.app/.MainActivity
TotalTime: ${String(totalMs)}
WaitTime: ${String(totalMs + 18)}
Complete`;

const GFXINFO = (rendered: number, janky: number): string => `Graphics info for pid 9213 [dev.humanite.app]:

Total frames rendered: ${String(rendered)}
Janky frames: ${String(janky)} (${(rendered === 0 ? 0 : (janky / rendered) * 100).toFixed(2)}%)
50th percentile: 6ms
90th percentile: 11ms
95th percentile: 14ms
99th percentile: 27ms
Number Missed Vsync: 2
Number High input latency: 0
Number Slow UI thread: 3`;

/** What `getprop` prints of a phone: a real one, shipped, running the manufacturer's own build. */
const PHONE = `[ro.product.model]: [A065]
[ro.product.manufacturer]: [Oppo]
[ro.build.characteristics]: [default]
[ro.build.version.sdk]: [35]`;

/** What `dumpsys package` prints of the shipped build: the flags a debuggable one would add are not there. */
const SHIPPED = `Package [dev.humanite.app] (3f2a1b8):
    userId=10412
    flags=[ HAS_CODE ALLOW_CLEAR_USER_DATA ALLOW_BACKUP ]
    versionName=0.0.0`;

/**
 * What `dumpsys display` prints, trimmed from what an A065 on Android 16 actually answered. The panel lists three
 * modes and the fastest is a hundred and twenty; the rate in force is ninety. Both are kept here because reading the
 * wrong one is the mistake this excerpt exists to catch.
 */
const DISPLAY = `Display Devices: size=1
  DisplayDeviceInfo{"Built-in Screen": uniqueId="local:4630946639017191809", 1080 x 2412, modeId 2, renderFrameRate 90.0, hasArrSupport false}
    mSupportedRefreshRates=[120.00001, 90.0, 60.000004]
      DisplayMode{id=0, width=1080, height=2412, peakRefreshRate=120.00001, vsyncRate=120.00001}
      DisplayMode{id=1, width=1080, height=2412, peakRefreshRate=90.0, vsyncRate=90.0}
      DisplayMode{id=2, width=1080, height=2412, peakRefreshRate=60.000004, vsyncRate=60.000004}
    mActiveRenderFrameRate=90.0
      DisplayModeRecord{mMode={id=1, width=1080, height=2412, fps=120.00001, vsync=120.00001}}
      DisplayModeRecord{mMode={id=2, width=1080, height=2412, fps=90.0, vsync=90.0}}`;

/** A session whose three answers are read and whose two budgets hold. */
const WITHIN: Answers = {
  props: PHONE,
  build: SHIPPED,
  startup: LAUNCH(940),
  frames: GFXINFO(1_812, 9),
  display: DISPLAY,
};

/** The bench hands every fixture the same shape, so a verdict that needs nothing but its answers still answers late. */
const judged = (answers: Answers) => async (): Promise<readonly PerfCode[]> =>
  Promise.resolve(judge(answers).findings.map((finding) => finding.code));

export const PERF_FIXTURES = [
  define('perf/within-budget', 'une session dont les deux budgets tiennent', [], judged(WITHIN)),
  define(
    'perf/cold-start-exceeded',
    'un lancement à froid plus long que son budget',
    ['perf/cold-start-exceeded'],
    judged({ ...WITHIN, startup: LAUNCH(2_130) }),
  ),
  define(
    'perf/scroll-jank-exceeded',
    'un défilement dont trop d’images sortent de leur échéance',
    ['perf/scroll-jank-exceeded'],
    judged({ ...WITHIN, frames: GFXINFO(1_812, 64) }),
  ),
  define(
    'perf/unreadable-startup',
    'un lancement dont l’appareil n’a pas dit la durée',
    ['perf/unreadable-startup'],
    judged({ ...WITHIN, startup: 'Error: Activity not started, unable to resolve Intent' }),
  ),
  define(
    'perf/unreadable-frames',
    'un relevé d’images qu’aucune ligne connue ne porte',
    ['perf/unreadable-frames'],
    judged({ ...WITHIN, frames: 'No process found for: dev.humanite.app' }),
  ),
  define(
    'perf/no-frames-rendered',
    'un relevé qui compte zéro image, qu’aucun budget ne saurait tenir',
    ['perf/unreadable-frames'],
    judged({ ...WITHIN, frames: GFXINFO(0, 0) }),
  ),
  define(
    'perf/unreadable-display',
    'un écran dont l’appareil n’a pas dit la fréquence',
    ['perf/unreadable-display'],
    judged({ ...WITHIN, display: 'Display Devices: size=0' }),
  ),
  define(
    'perf/emulator-refused',
    'une mesure prise sur l’émulateur du serveur, qui rend en logiciel',
    ['perf/emulator-refused'],
    judged({ ...WITHIN, props: PHONE.replace('[A065]', '[redroid15_x86_64]') }),
  ),
  define(
    'perf/emulator-refused-qemu',
    'une mesure prise sur une machine qui se déclare émulée sans le dire dans son modèle',
    ['perf/emulator-refused'],
    judged({ ...WITHIN, props: `${PHONE}\n[ro.kernel.qemu]: [1]` }),
  ),
  define(
    'perf/debuggable-refused',
    'une mesure prise sur le build de développement, qui n’est pas le programme livré',
    ['perf/debuggable-refused'],
    judged({ ...WITHIN, build: SHIPPED.replace('HAS_CODE', 'DEBUGGABLE HAS_CODE') }),
  ),
  define(
    'perf/unreadable-provenance',
    'un appareil qui n’a pas dit quel modèle il est',
    ['perf/unreadable-provenance'],
    judged({ ...WITHIN, props: '[ro.build.version.sdk]: [35]' }),
  ),
] as const;
