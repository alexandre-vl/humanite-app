import type { Article } from '@huma/contracts';
import type { Passage } from './controller';

/** Read only the body the source gave this reader. Pictures and their credits do not interrupt the prose. */
export function passagesOf(article: Article): readonly Passage[] {
  if (article.body.kind !== 'open') {
    return [];
  }
  const body = article.body.blocks
    .flatMap((block) => {
      switch (block.type) {
        case 'paragraph':
        case 'quote':
          return [{ text: block.spans.map((span) => span.text).join(''), heading: false }];
        case 'heading':
          return [{ text: block.text, heading: true }];
        case 'image':
          return [];
      }
    })
    .filter((passage) => passage.text.trim().length > 0);
  if (body.length === 0) {
    return [];
  }
  const head = [
    { text: article.title, heading: true },
    ...(article.standfirst === undefined ? [] : [{ text: article.standfirst, heading: false }]),
  ];
  return [...head, ...body].flatMap((passage) => speechChunks(passage.text).map((text) => ({ ...passage, text })));
}

/** Small, contiguous pieces start quickly; the server verifies every word against the source. */
function speechChunks(text: string): readonly string[] {
  const chunks: string[] = [];
  let rest = text.replace(/\s+/gu, ' ').trim();
  while (rest.length > 320) {
    const head = rest.slice(0, 320);
    const sentence = [...head.matchAll(/[.!?;:]\s/gu)].at(-1)?.index;
    const boundary = sentence !== undefined && sentence >= 80 ? sentence + 1 : head.lastIndexOf(' ');
    const end = boundary > 0 ? boundary : 320;
    chunks.push(rest.slice(0, end));
    rest = rest.slice(end).trim();
  }
  if (rest.length > 0) {
    chunks.push(rest);
  }
  return chunks;
}
