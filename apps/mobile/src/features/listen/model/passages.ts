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
  return [...head, ...body].map((passage) => ({ ...passage, text: passage.text.replace(/\s+/gu, ' ').trim() }));
}
