/**
 * The glob subset of scopes: `*` stays inside a path segment, `**` spans any number of segments, `?` is one character.
 * Braces, classes and negations are refused, so a scope reads the same in every tool.
 */

const FORBIDDEN = /[\s\\{}[\]!]/u;

/** A regular expression matching the repository paths of `glob`, or `null` when the glob is outside the subset. */
export function compileGlob(glob: string): RegExp | null {
  const segments = glob.split('/');
  if (FORBIDDEN.test(glob) || segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    return null;
  }
  const parts = segments.map((segment, index) => {
    const last = index === segments.length - 1;
    if (segment === '**') {
      return last ? '.+' : '(?:[^/]+/)*';
    }
    if (segment.includes('**')) {
      return null;
    }
    const body = Array.from(segment, (character) =>
      character === '*' ? '[^/]*' : character === '?' ? '[^/]' : RegExp.escape(character),
    ).join('');
    return last ? body : `${body}/`;
  });
  if (parts.some((part) => part === null)) {
    return null;
  }
  return new RegExp(`^${parts.join('')}$`, 'u');
}
