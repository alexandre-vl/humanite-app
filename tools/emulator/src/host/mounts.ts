/** A line of `/proc/<pid>/mountinfo`. */
export type Mount = Readonly<{
  mountPoint: string;
  /** Options of this mount: `rw,nosuid,nodev,noexec,relatime`. */
  mountOptions: string;
  fsType: string;
  /** Options of the filesystem, shared by every mount of it: `rw,mode=755`. */
  superOptions: string;
}>;

/** A path of mountinfo with its octal escapes (`\040` for a space) decoded. */
const decodePath = (path: string): string =>
  path.replaceAll(/\\(?<octal>[0-7]{3})/gu, (escape: string, octal: string) => String.fromCharCode(parseInt(octal, 8)));

/** The mounts of a mountinfo text, in order: a later mount on the same point hides the earlier ones. */
export function parseMountinfo(text: string): readonly Mount[] {
  return text
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => {
      const [mounted, filesystem] = line.split(' - ');
      const fields = mounted?.split(' ') ?? [];
      const [fsType, , superOptions] = filesystem?.split(' ') ?? [];
      const mountPoint = fields[4];
      const mountOptions = fields[5];
      if (
        mountPoint === undefined ||
        mountOptions === undefined ||
        fsType === undefined ||
        superOptions === undefined
      ) {
        throw new Error(`mountinfo : ligne illisible : ${line}`);
      }
      return { mountPoint: decodePath(mountPoint), mountOptions, fsType, superOptions };
    });
}

/** The mount visible at `mountPoint`, `null` when nothing is mounted there. */
export const visibleMount = (mounts: readonly Mount[], mountPoint: string): Mount | null =>
  mounts.findLast((mount) => mount.mountPoint === mountPoint) ?? null;
