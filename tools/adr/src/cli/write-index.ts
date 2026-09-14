import { writeIndex } from '../check.ts';
import { INDEX_FILE } from '../spec.ts';
import { findRoot } from './root.ts';
import { bindingsSource, print, runCommand } from './shared.ts';

await runCommand(async () => {
  const root = await findRoot();
  await writeIndex(root, (await bindingsSource(root)).bindings);
  print(`✓ ${INDEX_FILE} régénéré`);
  return 0;
});
