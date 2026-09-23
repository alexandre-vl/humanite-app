import { expect, test } from 'vitest';
import { judgeProse, readPlain, readProse } from './index.ts';
import { readLegend } from './prose.ts';

/**
 * The judging answers whether the readings of this module leave a screen only prose, on a body written for the
 * purpose. What they make of the bodies and the lines the journal actually filed is measured beside the client that
 * asks for them, in the package that keeps those answers.
 */
test('the readings of this module leave a screen nothing but text a reader should see', () => {
  expect(judgeProse({ prose: readProse, plain: readPlain })).toEqual([]);
});

/** A one-sentence body's runs, joined the way a screen draws them: one straight after the other. */
const drawn = (html: string): string =>
  readProse(`<p>${html}</p>`)
    .flatMap((block) => (block.type === 'paragraph' ? block.spans : []))
    .map((span) => span.text)
    .join('');

test.each([
  {
    shape: 'a line break between two runs',
    html: '<em>la suite.</em><br><em>Et la fin</em>',
    reads: 'la suite. Et la fin',
  },
  {
    shape: 'a blank between two runs',
    html: 'voir <a href="https://www.humanite.fr/">ici</a> <strong>et</strong> là',
    reads: 'voir ici et là',
  },
  { shape: 'the blank a run ends on', html: '<em>« assez », </em>a-t-il dit', reads: '« assez », a-t-il dit' },
  { shape: 'the blank a run opens with', html: 'un mot<em> souligné</em>', reads: 'un mot souligné' },
  {
    shape: 'an unbreakable space beside an ordinary one',
    html: '«&nbsp;<em>mot</em> &nbsp;»',
    reads: '«\u00A0mot\u00A0»',
  },
  { shape: 'the blank at either end of the sentence', html: ' <em>seul</em> ', reads: 'seul' },
])('the blank of a sentence survives its cutting into runs: $shape', ({ html, reads }) => {
  expect(drawn(html)).toBe(reads);
});

test('a run carries its words bare, and the blank at its edges goes to the plain words beside it', () => {
  const [block] = readProse('<p>voir <a href="https://www.humanite.fr/"> ici </a>et là</p>');
  expect(block?.type === 'paragraph' && block.spans).toEqual([
    { type: 'text', text: 'voir ' },
    { type: 'link', text: 'ici', target: { kind: 'external', url: 'https://www.humanite.fr/' } },
    { type: 'text', text: ' et là' },
  ]);
});

/** The journal writes a picture's credit into its caption; a reading sets it apart and keeps the « © » with its name. */
test.each([
  {
    shape: 'a credit glued to the last sentence',
    html: '<p>Le 8 juillet dernier, à New York. ©DPA/ABACA</p>',
    caption: 'Le 8 juillet dernier, à New York.',
    credit: '©\u00A0DPA/ABACA',
  },
  {
    shape: 'a credit behind a bar',
    html: 'Une manifestation | © Hans Lucas via AFP',
    caption: 'Une manifestation',
    credit: '©\u00A0Hans Lucas via AFP',
  },
  {
    shape: 'nothing but a credit',
    html: '© Yasuyoshi CHIBA / AFP',
    caption: '',
    credit: '©\u00A0Yasuyoshi CHIBA / AFP',
  },
  {
    shape: 'a body picture’s source',
    html: 'Une photo. | Source : iStock',
    caption: 'Une photo.',
    credit: 'Source : iStock',
  },
  { shape: 'a caption with no credit', html: 'Une photo sans crédit.', caption: 'Une photo sans crédit.', credit: '' },
  { shape: 'a mark that credits no one', html: 'Un tableau ©', caption: 'Un tableau', credit: '' },
])('a caption is read apart from its credit: $shape', ({ html, caption, credit }) => {
  expect(readLegend(html)).toEqual({ caption, credit });
});
