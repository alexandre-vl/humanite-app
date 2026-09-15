import { expect, test } from 'vitest';
import { parseMountinfo, visibleMount } from './mounts.ts';

const MOUNTINFO = [
  '37 24 0:8 / /sys/kernel/debug rw,nosuid,nodev,noexec,relatime shared:14 - debugfs debugfs rw,mode=755',
  '40 24 0:13 / /sys/kernel/tracing rw,nosuid,nodev,noexec,relatime shared:16 - tracefs tracefs rw',
  '41 24 0:13 / /sys/kernel/tracing rw,relatime - tracefs tracefs rw,gid=3012',
  '50 24 0:40 / /mnt/with\\040space rw - tmpfs tmpfs rw',
  '',
].join('\n');

test('reads mount points, options of the mount and of its filesystem', () => {
  const mounts = parseMountinfo(MOUNTINFO);
  expect(visibleMount(mounts, '/sys/kernel/debug')).toEqual({
    mountPoint: '/sys/kernel/debug',
    mountOptions: 'rw,nosuid,nodev,noexec,relatime',
    fsType: 'debugfs',
    superOptions: 'rw,mode=755',
  });
  expect(visibleMount(mounts, '/sys/kernel/tracing')?.superOptions).toBe('rw,gid=3012');
  expect(visibleMount(mounts, '/mnt/with space')?.fsType).toBe('tmpfs');
  expect(visibleMount(mounts, '/nowhere')).toBeNull();
  expect(() => parseMountinfo('37 24 0:8 /\n')).toThrow('illisible');
});
