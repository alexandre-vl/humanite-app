import { expect, test } from 'vitest';
import { EMULATOR } from './config.ts';
import { CONFIG_LABEL, configFingerprint, parseContainerInspect, parseImageInspect, runArguments } from './docker.ts';

test('creates the container the spike verified: privileged, adb on the loopback, capped, binder devices mapped', () => {
  const args = runArguments(EMULATOR);
  const [command, labelFlag, label] = args;
  expect([command, labelFlag, label]).toEqual(['run', '--label', `${CONFIG_LABEL}=${configFingerprint(EMULATOR)}`]);
  // The line the spike verified, with the names the configuration gives: it answers for how the container is run,
  // never for what it is called.
  expect(args.join(' ')).toContain(
    `--detach --name ${EMULATOR.container} --privileged --network ${EMULATOR.network} --publish 127.0.0.1:5555:5555 --memory 3g --memory-swap 3g --cpus 3 --pids-limit 8192 --volume /dev/binder1:/dev/binder --volume /dev/binder2:/dev/hwbinder --volume /dev/binder3:/dev/vndbinder --volume ${EMULATOR.volume}:/data sha256:f096388ce85946ef6c599766043ce21e24e4b95e320702c03a4d77472c4db11f androidboot.redroid_width=720 androidboot.redroid_height=1280 androidboot.redroid_dpi=320 androidboot.redroid_fps=15 androidboot.redroid_gpu_mode=guest androidboot.use_memfd=1`,
  );
});

test('the fingerprint follows every option of the container', () => {
  expect(configFingerprint({ ...EMULATOR, limits: { ...EMULATOR.limits, memoryGib: 4 } })).not.toBe(
    configFingerprint(EMULATOR),
  );
});

test('reads containers and images, an empty list meaning none', () => {
  const container = JSON.stringify([
    {
      State: { Status: 'running', StartedAt: '2026-09-13T16:09:19.379741917Z' },
      Config: { Labels: { [CONFIG_LABEL]: 'abc' } },
    },
  ]);
  expect(parseContainerInspect(container)).toEqual({
    status: 'running',
    startedAt: '2026-09-13T16:09:19.379741917Z',
    fingerprint: 'abc',
  });
  expect(parseContainerInspect('[]')).toBeNull();
  const image = JSON.stringify([
    { Id: EMULATOR.image.id, RepoTags: [EMULATOR.image.reference], RepoDigests: [EMULATOR.image.digest] },
  ]);
  expect(parseImageInspect(image)).toEqual({
    id: EMULATOR.image.id,
    tags: [EMULATOR.image.reference],
    digests: [EMULATOR.image.digest],
  });
  expect(parseImageInspect('[]')).toBeNull();
  expect(() => parseContainerInspect('{')).toThrow('illisible');
});
