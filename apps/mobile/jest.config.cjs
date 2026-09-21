/**
 * The app's bench: jest-expo over the sources, with the stand-ins the runner needs loaded before anything imports.
 *
 * `testTimeout` is the app's and not jest's. Jest holds a test to five seconds by default, and a case here renders a
 * screen — the React Native transform, a virtualised list, a query client and the corpus behind it — on a machine that
 * runs other work at the same time. Measured on this box, whole files take 17,5 s (search) and 21,4 s (newsstand), so
 * a single case approaching five is not a case that hung: it is a case that queued. It has twice reported as one —
 * three cases of the front page once, then the reading screen during a commit — each time passing on the next run,
 * each time under load. A limit that fires on how busy the machine is measures the machine.
 *
 * Thirty seconds is not a budget, it is a ceiling: what a hung run actually costs is held by the runner, which stops
 * the whole bench at 540 s (`tools/governance/src/cli/test-app.ts`). That is the number to change when a bench stops
 * ending; this one only stops a single case from being called dead while it is still waiting its turn.
 */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/jest.setup.ts'],
  testTimeout: 30_000,
};
