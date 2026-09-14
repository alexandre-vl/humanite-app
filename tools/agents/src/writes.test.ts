import { describe, expect, test } from 'vitest';
import { readCommands } from './shell/commands.ts';
import type { WriteEffect } from './writes.ts';
import { writeTargets } from './writes.ts';

const effectLabel = (effect: WriteEffect): string => {
  switch (effect.kind) {
    case 'content':
      return `content${effect.append ? '+' : ''}:${effect.content ?? '?'}`;
    case 'copy':
      return `copy:${effect.source.text}`;
    case 'tree':
      return `tree${effect.names === null ? '' : `:${effect.names.map((name) => name.text).join(',')}`}`;
    case 'remove':
    case 'alias':
    case 'metadata':
      return effect.kind;
  }
};

/** Write targets of every command of a line, as `path=effect`, base first when the command sets one. */
const writes = (line: string): readonly string[] =>
  readCommands(line, { home: '/home/agent' }).flatMap((command) =>
    writeTargets(command).map(
      (written) =>
        `${written.base === null ? '' : `${written.base.text}:`}${written.path.text}=${effectLabel(written.effect)}`,
    ),
  );

describe('writeTargets', () => {
  test('redirections, with the printed text when echo, printf or cat of a here-document tell it', () => {
    expect(writes('echo a b > f; echo -n c >> g; printf "%s\\n" x y > h; ls 2> e; cat > i <<EOF\nz\nEOF')).toEqual([
      'f=content:a b\n',
      'g=content+:c',
      'h=content:x\ny\n',
      'e=content:?',
      'i=content:z\n',
    ]);
  });

  test('in-place editors write the files after their script', () => {
    expect(
      writes("sed -i 's/a/b/' f g; sed -e x -i.bak h; sed 's/a/b/' i; perl -pi -e 's/a/b/' j; sed -n p k"),
    ).toEqual(['f=content:?', 'g=content:?', 'h=content:?', 'j=content:?']);
  });

  test('copies and moves write their destination with the source content; moves remove the source', () => {
    expect(writes('cp a b; cp a b d/; cp -t d a; cp -r a b; mv a b; install -m 644 a b')).toEqual([
      'b=copy:a',
      'b/a=copy:a',
      'd//a=copy:a',
      'd//b=copy:b',
      'd/a=copy:a',
      'b=tree',
      'b/a=tree',
      'a=remove',
      'b=copy:a',
      'b/a=copy:a',
      'b=copy:a',
      'b/a=copy:a',
    ]);
  });

  test('links name a new file and alias their target', () => {
    expect(writes('ln -s /x/adr.md lien; ln /x/adr.md')).toEqual([
      'lien=content:?',
      'lien/adr.md=content:?',
      '/x/adr.md=alias',
      'adr.md=content:?',
      '/x/adr.md=alias',
    ]);
  });

  test('removals, metadata and the other writers', () => {
    expect(
      writes(
        'rm -rf a; unlink b; chmod -x c; chmod --reference=r d; chown u:g e; touch f; truncate -s 0 g; dd if=x of=h; tee -a i < in; shred -u j; curl -sSLo k u; wget -O l u',
      ),
    ).toEqual([
      'a=remove',
      'b=remove',
      'c=metadata',
      'd=metadata',
      'e=metadata',
      'f=metadata',
      'g=content:?',
      'h=content:?',
      'i=content+:?',
      'j=remove',
      'k=content:?',
      'l=content:?',
    ]);
  });

  test('git moves and removes paths relative to its -C directories', () => {
    expect(writes('git -C sub mv a b; git rm --cached c; git rm d; git config --file e k v')).toEqual([
      'sub:a=remove',
      'sub:b=copy:a',
      'sub:b/a=copy:a',
      'd=remove',
      'e=content:?',
    ]);
  });

  test('find writes a tree below its start paths when it deletes or edits {}, narrowed by -name', () => {
    expect(
      writes(
        String.raw`find docs -name '*.md' -delete; find . -name '*.ts' -exec sed -i s/a/b/ {} +; find a -o -name x -delete; find b -exec cat {} \;; find c -fprint out`,
      ),
    ).toEqual(['docs=tree:*.md', '.=tree:*.ts', 'a=tree', 'out=content:?']);
  });

  test('archives and synchronisations write a tree at their destination', () => {
    expect(writes('tar -xzf a.tgz -C out; tar czf b.tgz dir; unzip c.zip; rsync -a src/ dest')).toEqual([
      'out=tree',
      '.=tree',
      'dest=tree',
    ]);
  });
});
