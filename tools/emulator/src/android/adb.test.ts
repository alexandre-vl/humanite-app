import { expect, test } from 'vitest';
import { adbText, parseDevices, parseReverseList } from './adb.ts';

test('adb output reads the same whether adbd ends lines with CRLF or LF', () => {
  expect(adbText(Buffer.from('1\r\n'))).toBe('1\n');
});

test('reads reverse forwards and device states', () => {
  expect(parseReverseList('127.0.0.1:5555 tcp:8081 tcp:8081\n')).toEqual([
    { serial: '127.0.0.1:5555', remote: 'tcp:8081', local: 'tcp:8081' },
  ]);
  expect(parseReverseList('')).toEqual([]);
  const devices = parseDevices(
    '* daemon not running; starting now at tcp:5037\n* daemon started successfully\nList of devices attached\n127.0.0.1:5555\toffline\n\n',
  );
  expect([...devices]).toEqual([['127.0.0.1:5555', 'offline']]);
});
