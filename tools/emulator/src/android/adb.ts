/** Output of adb as text, lines ending with LF: adbd ends them with CRLF on some transports. */
export const adbText = (bytes: Buffer): string => bytes.toString('utf8').replaceAll('\r\n', '\n');

/** A reverse forward of `adb reverse --list`: the device's `remote` socket reaches the host's `local` one. */
export type ReverseForward = Readonly<{ serial: string; remote: string; local: string }>;

export function parseReverseList(text: string): readonly ReverseForward[] {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const [serial, remote, local] = line.trim().split(/\s+/u);
      if (serial === undefined || remote === undefined || local === undefined) {
        throw new Error(`adb reverse --list : ligne illisible : ${line}`);
      }
      return { serial, remote, local };
    });
}

/** Lines of `adb devices` that list no device: its header, and the notices of a server it had to start. */
const NOT_A_DEVICE = /^(?:List of devices attached|\* )/u;

/** The state of each device of `adb devices`: `device` once usable, `offline` or `unauthorized` otherwise. */
export function parseDevices(text: string): ReadonlyMap<string, string> {
  return new Map(
    text
      .split('\n')
      .filter((line) => line.trim() !== '' && !NOT_A_DEVICE.test(line))
      .map((line) => {
        const [serial, state] = line.trim().split(/\s+/u);
        if (serial === undefined || state === undefined) {
          throw new Error(`adb devices : ligne illisible : ${line}`);
        }
        return [serial, state] as const;
      }),
  );
}
