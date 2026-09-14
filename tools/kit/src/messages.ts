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

/** Same reading as `Placeholder`: from a `{` to the first `}` after it. */
const PLACEHOLDER = /\{([^}]*)\}/gu;

const PLACEHOLDER_NAME = /^\w+$/u;

/** Names of the placeholders of `template`; a name that is not a word is a programming error. */
export function placeholders(owner: string, template: string): readonly string[] {
  return [...template.matchAll(PLACEHOLDER)].map(([placeholder, name = '']) => {
    if (!PLACEHOLDER_NAME.test(name)) {
      throw new Error(`${owner} : espace réservé invalide ${placeholder}`);
    }
    return name;
  });
}

const renderValue = (value: DetailValue): string =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : value.map(String).join(', ');

/** `template` with its placeholders filled; a missing value is a programming error, named after `owner`. */
export function renderMessage(owner: string, template: string, details: Readonly<Record<string, DetailValue>>): string {
  placeholders(owner, template);
  return template.replace(PLACEHOLDER, (placeholder: string, name: string) => {
    const value = details[name];
    if (value === undefined) {
      throw new Error(`${owner} : valeur manquante pour ${placeholder}`);
    }
    return renderValue(value);
  });
}
