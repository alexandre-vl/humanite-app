/**
 * Message templates with `{name}` placeholders, whose value types are derived from the template: a check declares its
 * messages as data, and a reporter cannot forget, misname or add a value.
 */

type Placeholder<Template extends string> = Template extends `${string}{${infer Name}}${infer Rest}`
  ? Name | Placeholder<Rest>
  : never;

export type DetailValue = string | number | readonly (string | number)[];

/**
 * Values of the placeholders of `Template`: no value at all for a template without placeholder. A template widened to
 * `string` has no knowable placeholders and accepts nothing.
 */
export type MessageDetails<Template extends string> = string extends Template
  ? never
  : [Placeholder<Template>] extends [never]
    ? Readonly<Record<string, never>>
    : Readonly<Record<Placeholder<Template>, DetailValue>>;

/** A placeholder of a template: where it sits, braces included, and its name. */
type Slot = Readonly<{ start: number; end: number; name: string }>;

/**
 * The placeholders of `template`, read as `Placeholder` reads them: from a `{` to the first `}` after it. Each search
 * starts where the last one ended, so the reading stays linear, where `/\{[^}]*\}/g` scans the rest of the template
 * again from every `{` that no `}` follows.
 */
function slotsOf(template: string): readonly Slot[] {
  const slots: Slot[] = [];
  let start = template.indexOf('{');
  while (start !== -1) {
    const close = template.indexOf('}', start + 1);
    if (close === -1) {
      break;
    }
    slots.push({ start, end: close + 1, name: template.slice(start + 1, close) });
    start = template.indexOf('{', close + 1);
  }
  return slots;
}

const PLACEHOLDER_NAME = /^\w+$/u;

/** Names of the placeholders of `template`; a name that is not a word is a programming error. */
export function placeholders(owner: string, template: string): readonly string[] {
  return slotsOf(template).map(({ start, end, name }) => {
    if (!PLACEHOLDER_NAME.test(name)) {
      throw new Error(`${owner} : espace réservé invalide ${template.slice(start, end)}`);
    }
    return name;
  });
}

const renderValue = (value: DetailValue): string =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : value.map(String).join(', ');

/** `template` with its placeholders filled; a missing value is a programming error, named after `owner`. */
export function renderMessage(owner: string, template: string, details: Readonly<Record<string, DetailValue>>): string {
  placeholders(owner, template);
  let rendered = '';
  let read = 0;
  for (const { start, end, name } of slotsOf(template)) {
    const value = details[name];
    if (value === undefined) {
      throw new Error(`${owner} : valeur manquante pour ${template.slice(start, end)}`);
    }
    rendered += template.slice(read, start) + renderValue(value);
    read = end;
  }
  return rendered + template.slice(read);
}
