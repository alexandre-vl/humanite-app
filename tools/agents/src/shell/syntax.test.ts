import { describe, expect, test } from 'vitest';
import type { RawPart, RawScript, RawWord } from './syntax.ts';
import { readCommandLine, readExpandingText } from './syntax.ts';

const partText = (part: RawPart): string => {
  switch (part.kind) {
    case 'text':
      return part.text;
    case 'home':
      return '~';
    case 'parameter':
      return `$${part.name}`;
    case 'substitution':
    case 'opaque':
      return part.source;
  }
};

const wordText = (word: RawWord): string => word.map(partText).join('');

const commandWords = (script: RawScript): readonly (readonly string[])[] =>
  script.map((command) => command.words.map(wordText));

describe('readCommandLine', () => {
  test('splits on operators and newlines, and skips comments that start a word', () => {
    expect(commandWords(readCommandLine('a 1 && b|c; d & e\n# f g\nh#i # j'))).toEqual([
      ['a', '1'],
      ['b'],
      ['c'],
      ['d'],
      ['e'],
      ['h#i'],
    ]);
  });

  test('removes quotes and escapes, and marks quoted text', () => {
    const [command] = readCommandLine(String.raw`echo 'a b' "c \"d\" \$e" f\ g $'h\x41\né' $"i"`);
    expect(command?.words.map(wordText)).toEqual(['echo', 'a b', 'c "d" $e', 'f g', 'hA\né', 'i']);
    expect(command?.words[1]).toEqual([{ kind: 'text', text: 'a b', quoted: true }]);
    expect(command?.words[3]).toEqual([
      { kind: 'text', text: 'f', quoted: false },
      { kind: 'text', text: ' ', quoted: true },
      { kind: 'text', text: 'g', quoted: false },
    ]);
  });

  test('keeps an empty quoted word, and joins lines continued by a backslash', () => {
    expect(commandWords(readCommandLine('printf "" x \\\n  y'))).toEqual([['printf', '', 'x', 'y']]);
  });

  test('reads parameters, the home directory and the expansions whose value it cannot know', () => {
    const [command] = readCommandLine('echo $name ${other} ~/x ~user/y $1 ${x:-z} $((1 + 2))');
    expect(command?.words.slice(1).map((word) => word.map((part) => part.kind))).toEqual([
      ['parameter'],
      ['parameter'],
      ['home', 'text'],
      ['opaque', 'text'],
      ['opaque'],
      ['opaque'],
      ['opaque'],
    ]);
  });

  test('parses the scripts of substitutions, backquotes, process substitutions and arithmetic in place', () => {
    const [command] = readCommandLine('diff <(git show HEAD:a) "$(cat `ls`)" $((1 + $(wc -l < f)))');
    const scripts = command?.words.flatMap((word) =>
      word.flatMap((part) =>
        part.kind === 'substitution' ? [part.script] : part.kind === 'opaque' ? part.scripts : [],
      ),
    );
    expect(scripts?.map(commandWords)).toEqual([[['git', 'show', 'HEAD:a']], [['cat', '`ls`']], [['wc', '-l']]]);
  });

  test('reads output, input and duplicated redirections with their descriptor', () => {
    const [command] = readCommandLine('cmd > out 2>>err &>all <in 2>&1 >&- 3<>rw >|force');
    expect(command?.words.map(wordText)).toEqual(['cmd']);
    expect(
      command?.redirections.map((redirection) =>
        redirection.kind === 'output'
          ? `${String(redirection.descriptor)}${redirection.operator}${wordText(redirection.target)}`
          : redirection.kind,
      ),
    ).toEqual(['null>out', '2>>err', 'null&>all', 'input', 'duplicate', 'duplicate', '3<>rw', 'null>|force']);
  });

  test('reads here-documents after the line, quoted or expanding, and here-strings', () => {
    const [cat, echo, sh] = readCommandLine(
      "cat <<'EOF' > a\n$x `b`\nEOF\necho <<-END\n\tvalue $y\n\tEND\nsh <<< 'ls'",
    );
    expect(cat?.redirections[0]).toEqual({
      kind: 'text',
      text: { source: '$x `b`\n', parts: [{ kind: 'text', text: '$x `b`\n', quoted: true }] },
    });
    const document = echo?.redirections[0];
    expect(document?.kind === 'text' ? document.text.parts.map((part) => part.kind) : []).toEqual([
      'text',
      'parameter',
      'text',
    ]);
    expect(sh?.redirections[0]?.kind === 'text' ? sh.redirections[0].text.source : '').toBe('ls\n');
  });

  test('ends a substitution at its own parenthesis, even around a here-document holding one', () => {
    const script = readCommandLine("git commit -m \"$(cat <<'EOF'\nfix: x ) l'outil\nEOF\n)\" && git push");
    expect(commandWords(script)).toEqual([
      ['git', 'commit', '-m', expect.stringContaining('fix: x )')],
      ['git', 'push'],
    ]);
  });

  test('reads text as a here-document body: dollar and backquote expand, quotes stay', () => {
    expect(readExpandingText('a "b" $c \\$d').map((part) => part.kind)).toEqual(['text', 'parameter', 'text']);
  });
});
