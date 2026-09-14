/**
 * Message templates with `{name}` placeholders, whose value types are derived from the template: a check declares
 * its messages as data, and a reporter cannot forget or misname a value.
 */

type Placeholder<Template extends string> = Template extends `${string}{${infer Name}}${infer Rest}`
  ? Name | Placeholder<Rest>
  : never;

export type DetailValue = string | number | readonly (string | number)[];

/** Values of the placeholders of `Template`; `{}` for a template without placeholder. */
export type MessageDetails<Template extends string> = Readonly<Record<Placeholder<Template>, DetailValue>>;

const renderValue = (value: DetailValue): string =>
  typeof value === 'string' ? value : typeof value === 'number' ? String(value) : value.map(String).join(', ');

/** `template` with its placeholders filled; a missing value is a programming error, named after `owner`. */
export function renderMessage(owner: string, template: string, details: Readonly<Record<string, DetailValue>>): string {
  return template.replace(/\{(\w+)\}/gu, (placeholder: string, name: string) => {
    const value = details[name];
    if (value === undefined) {
      throw new Error(`${owner} : valeur manquante pour ${placeholder}`);
    }
    return renderValue(value);
  });
}
