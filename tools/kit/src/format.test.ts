import { writeFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { formatForPath } from './format.ts';
import { temporaryDirectory } from './fs.ts';
import { repoPath } from './paths.ts';

test('formatForPath applies the Prettier configuration and the .editorconfig of the target, as the CLI does', async () => {
  await using directory = await temporaryDirectory('kit-format');
  await writeFile(`${directory.path}/.editorconfig`, 'root = true\n\n[*]\nindent_style = tab\n');
  await writeFile(`${directory.path}/.prettierrc.json`, '{ "singleQuote": true }\n');
  expect(await formatForPath(directory.path, repoPath('a.json'), '{"a":{"b":"c"}}')).toBe('{ "a": { "b": "c" } }\n');
  expect(await formatForPath(directory.path, repoPath('a.ts'), 'const a = {\nb: "c"}')).toBe(
    "const a = {\n\tb: 'c',\n};\n",
  );
});
