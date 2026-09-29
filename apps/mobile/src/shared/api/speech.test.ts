import { describe, expect, it, jest } from '@jest/globals';
import { createSpeech } from './speech';

jest.mock('../lib/speech', () => ({ saveSpeech: jest.fn() }));

function bench() {
  const request = jest.fn<typeof fetch>();
  const reader = {
    token: () => 'reader-token',
    renew: jest.fn<(sent: string, fresh: string) => void>(),
    reopen: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
    signOut: jest.fn<() => void>(),
  };
  const save = jest
    .fn<(bytes: Uint8Array, duration: number) => { uri: string; duration: number }>()
    .mockImplementation((bytes, duration) => ({ uri: 'audio.wav', duration }));
  return { request, reader, save, session: createSpeech('123', { request, reader, save }) };
}
const ready = (): Response =>
  Response.json({ status: 'ready', ticket: 'signed-ticket', duration: 3 }, { headers: { 'x-user-token': 'renewed' } });
const wave = (): Response => new Response(new Uint8Array(100), { headers: { 'content-type': 'audio/wav' } });

describe('server article audio', () => {
  it('renews the reader and sends credentials only when authorizing the text', async () => {
    const b = bench();
    b.request.mockResolvedValueOnce(ready()).mockResolvedValueOnce(wave());
    const recording = await b.session.speak('Bonjour.', new AbortController().signal);
    expect(recording.duration).toBe(3);
    expect(b.reader.renew).toHaveBeenCalledWith('reader-token', 'renewed');
    expect(b.request.mock.calls[0]?.[1]?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer reader-token',
    });
    expect(b.request.mock.calls[1]?.[1]?.headers).toBeUndefined();
    expect(b.save).toHaveBeenCalledTimes(1);
  });
  it('reopens an expired reader once and refuses a second expiry', async () => {
    const b = bench();
    b.request.mockResolvedValue(new Response(null, { status: 401 }));
    await expect(b.session.speak('Bonjour.', new AbortController().signal)).rejects.toThrow('refused');
    expect(b.reader.reopen).toHaveBeenCalledTimes(1);
    expect(b.request).toHaveBeenCalledTimes(2);
    expect(b.save).not.toHaveBeenCalled();
  });
  it('resubmits a job lost during a server restart and downloads the completed audio', async () => {
    const b = bench();
    b.request
      .mockResolvedValueOnce(Response.json({ status: 'queued', ticket: 'first-ticket' }))
      .mockResolvedValueOnce(new Response(null, { status: 410 }))
      .mockResolvedValueOnce(Response.json({ status: 'queued', ticket: 'second-ticket' }))
      .mockResolvedValueOnce(Response.json({ status: 'ready', duration: 3 }))
      .mockResolvedValueOnce(wave());
    await b.session.speak('Bonjour.', new AbortController().signal);
    expect(b.request).toHaveBeenCalledTimes(5);
    expect(b.request.mock.calls[1]?.[0]).toContain('?wait=20');
    expect(b.save).toHaveBeenCalledTimes(1);
  });
  it('waits through a brief deployment outage instead of interrupting the current passage', async () => {
    const b = bench();
    b.request
      .mockResolvedValueOnce(new Response(null, { status: 503, headers: { 'retry-after': '0' } }))
      .mockResolvedValueOnce(ready())
      .mockResolvedValueOnce(wave());
    await b.session.speak('Bonjour.', new AbortController().signal);
    expect(b.request).toHaveBeenCalledTimes(3);
    expect(b.save).toHaveBeenCalledTimes(1);
  });
  it('does not persist a response received after cancellation', async () => {
    const b = bench();
    const pending = Promise.withResolvers<Response>();
    const controller = new AbortController();
    b.request.mockResolvedValueOnce(ready()).mockReturnValueOnce(pending.promise);
    const result = b.session.speak('Bonjour.', controller.signal);
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    controller.abort();
    pending.resolve(wave());
    await expect(result).rejects.toThrow();
    expect(b.save).not.toHaveBeenCalled();
  });
  it('rejects malformed jobs before following an untrusted ticket', async () => {
    const b = bench();
    b.request.mockResolvedValueOnce(Response.json({ status: 'ready', ticket: '../anything', duration: 3 }));
    await expect(b.session.speak('Bonjour.', new AbortController().signal)).rejects.toThrow('Invalid audio job');
    expect(b.request).toHaveBeenCalledTimes(1);
  });
});
