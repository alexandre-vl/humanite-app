import type { Unit } from '@huma/perf/budgets';
import { BUDGETS } from '@huma/perf/budgets';
import { judge } from '@huma/perf/check';
import { readSession, transcript } from '@huma/perf/measure';
import { print, readArguments, runCommand } from '@huma/kit/cli';

const USAGE = [
  'Usage : pnpm perf:check <dossier-de-session>',
  '        pnpm perf:check --transcript --package <paquet> --serial <appareil> <dossier-de-session>',
].join('\n');

const PACKAGE = 'dev.humanite.app';

/** How a unit is written beside a number, which is not how it is named in the table. */
const SYMBOL = { ms: 'ms', percent: '%' } as const satisfies Readonly<Record<Unit, string>>;

await runCommand(async () => {
  const { values, positionals } = readArguments(USAGE, {
    options: {
      transcript: { type: 'boolean', default: false },
      package: { type: 'string', default: PACKAGE },
      serial: { type: 'string', default: '' },
    },
    allowPositionals: true,
  });
  const [directory] = positionals;
  if (directory === undefined) {
    print(USAGE);
    return 1;
  }

  if (values.transcript) {
    print(`# les commandes d’une session sur l’appareil, dans cet ordre`);
    for (const line of transcript(values.package, values.serial === '' ? '<appareil>' : values.serial, directory)) {
      print(line);
    }
    return 0;
  }

  const report = judge(await readSession(directory));
  for (const { budget, value, limit, within } of report.measures) {
    const { unit, what } = BUDGETS[budget];
    const shown = `${String(Math.round(value * 100) / 100)} ${SYMBOL[unit]}`;
    print(`${within ? '✓' : '✗'} ${what} : ${shown} (${String(limit)} ${SYMBOL[unit]} au plus)`);
  }
  if (report.hz !== null) {
    print(`· écran à ${String(report.hz)} Hz`);
  }
  for (const { code, detail } of report.findings) {
    print(`✗ ${code} : ${detail}`);
  }
  return report.findings.length === 0 ? 0 : 1;
});
