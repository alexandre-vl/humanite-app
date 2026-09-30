import { describe, expect, it, jest } from '@jest/globals';
import { createSpeech } from './speech';

function bench() {
  const request = jest.fn<typeof fetch>();
  const reader = {
    token: () => 'reader-token',
    renew: jest.fn<(sent: string, fresh: string) => void>(),
    reopen: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
    signOut: jest.fn<() => void>(),
  };
  return { request, reader, session: createSpeech('123', { request, reader }) };
}
const ready = (patch = {}): Response =>
  Response.json(
    {
      version: 1,
      state: 'complete',
      ticket: 'signed-ticket',
      duration: 30,
      cues: [
        { index: 0, start: 0 },
        { index: 1, start: 12 },
      ],
      ...patch,
    },
    { headers: { 'x-user-token': 'renewed' } },
  );
const blocks = ['Un titre.', 'Un paragraphe.'];

describe('continuous article audio', () => {
  it('authorizes the document once and gives the native player a fixed-origin URL without reader credentials', async () => {
    const b = bench();
    b.request.mockResolvedValueOnce(ready());
    const update = jest.fn();
    const uri = await b.session.open(blocks, new AbortController().signal, update);
    expect(uri).toBe('https://audio-humanite.alexvl.fr/v2/streams/signed-ticket/index.m3u8');
    expect(b.request).toHaveBeenCalledTimes(1);
    expect(b.request.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ blocks }));
    expect(b.reader.renew).toHaveBeenCalledWith('reader-token', 'renewed');
    expect(update).toHaveBeenCalledWith({
      complete: true,
      duration: 30,
      cues: [
        { index: 0, start: 0 },
        { index: 1, start: 12 },
      ],
    });
    b.session.close();
  });
  it('reopens an expired reader only once', async () => {
    const b = bench();
    b.request.mockResolvedValue(new Response(null, { status: 401 }));
    await expect(b.session.open(blocks, new AbortController().signal, jest.fn())).rejects.toThrow('refused');
    expect(b.reader.reopen).toHaveBeenCalledTimes(1);
    expect(b.request).toHaveBeenCalledTimes(2);
  });
  it('rejects late responses after a stop without renewing the reader or starting playback', async () => {
    const b = bench();
    const pending = Promise.withResolvers<Response>();
    b.request.mockReturnValueOnce(pending.promise);
    const update = jest.fn();
    const result = b.session.open(blocks, new AbortController().signal, update);
    b.session.close();
    pending.resolve(ready());
    await expect(result).rejects.toThrow('cancelled');
    expect(update).not.toHaveBeenCalled();
    expect(b.reader.renew).not.toHaveBeenCalled();
  });
  it.each([
    { ticket: '../private' },
    { duration: -1 },
    { duration: 1801 },
    {
      cues: [
        { index: 0, start: 15 },
        { index: 1, start: 10 },
      ],
    },
    { cues: [{ index: 2, start: 0 }] },
    { state: 'failed' },
  ])('rejects malformed metadata or an unsafe ticket: %j', async (patch) => {
    const b = bench();
    b.request.mockResolvedValueOnce(ready(patch));
    await expect(b.session.open(blocks, new AbortController().signal, jest.fn())).rejects.toThrow();
  });
  it('follows cue metadata without another authorization or an audio download', async () => {
    const b = bench();
    const update = jest.fn();
    b.request
      .mockResolvedValueOnce(ready({ state: 'generating', duration: 0, cues: [] }))
      .mockResolvedValueOnce(ready());
    await b.session.open(blocks, new AbortController().signal, update);
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(b.request.mock.calls[1]?.[0]).toContain('/metadata?after=0');
    expect(b.request.mock.calls[1]?.[1]?.headers).toBeUndefined();
    expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ complete: true }));
    b.session.close();
  });
  it('recovers chapter metadata after a transient network error without reopening the stream', async () => {
    jest.useFakeTimers();
    const b = bench();
    try {
      const update = jest.fn();
      b.request
        .mockResolvedValueOnce(ready({ state: 'generating', duration: 0, cues: [] }))
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce(ready());
      await b.session.open(blocks, new AbortController().signal, update);
      await jest.advanceTimersByTimeAsync(1000);
      expect(b.request).toHaveBeenCalledTimes(3);
      expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ complete: true }));
      expect(b.request.mock.calls.filter((call) => call[1]?.method === 'POST')).toHaveLength(1);
    } finally {
      b.session.close();
      jest.useRealTimers();
    }
  });
  it('cancels metadata retries when the listener closes', async () => {
    jest.useFakeTimers();
    const b = bench();
    try {
      b.request
        .mockResolvedValueOnce(ready({ state: 'generating', duration: 0, cues: [] }))
        .mockRejectedValue(new Error('offline'));
      await b.session.open(blocks, new AbortController().signal, jest.fn());
      await jest.advanceTimersByTimeAsync(0);
      b.session.close();
      await jest.advanceTimersByTimeAsync(10000);
      expect(b.request).toHaveBeenCalledTimes(2);
    } finally {
      b.session.close();
      jest.useRealTimers();
    }
  });
  it('reports an expired metadata session so a pending resume cannot hang forever', async () => {
    const b = bench();
    const unavailable = jest.fn();
    b.request
      .mockResolvedValueOnce(ready({ state: 'generating', duration: 0, cues: [] }))
      .mockResolvedValueOnce(new Response(null, { status: 410 }));
    await b.session.open(blocks, new AbortController().signal, jest.fn(), unavailable);
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(unavailable).toHaveBeenCalledTimes(1);
    b.session.close();
  });
  it('bounds repeated metadata failures and recovers from a temporary service outage', async () => {
    jest.useFakeTimers();
    const b = bench();
    const unavailable = jest.fn();
    try {
      const update = jest.fn();
      b.request
        .mockResolvedValueOnce(ready({ state: 'generating', duration: 0, cues: [] }))
        .mockResolvedValueOnce(new Response(null, { status: 503 }))
        .mockResolvedValueOnce(ready({ state: 'generating', duration: 5, cues: [{ index: 0, start: 0 }] }))
        .mockRejectedValue(new Error('offline'));
      await b.session.open(blocks, new AbortController().signal, update, unavailable);
      await jest.advanceTimersByTimeAsync(1000);
      expect(update).toHaveBeenLastCalledWith(expect.objectContaining({ duration: 5 }));
      await jest.advanceTimersByTimeAsync(60000);
      expect(unavailable).toHaveBeenCalledTimes(1);
      const count = b.request.mock.calls.length;
      await jest.advanceTimersByTimeAsync(60000);
      expect(b.request).toHaveBeenCalledTimes(count);
    } finally {
      b.session.close();
      jest.useRealTimers();
    }
  });
});
