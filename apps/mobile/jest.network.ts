import { afterEach } from '@jest/globals';

// A test stands in for the network, or does without it. The runner's own `fetch` is Expo's, over native requests the
// preset stubs to do nothing: a test that forgot to stand in gets a reply with no status and no body, which the client
// names `malformed` — a failure a test can pass on, answered by nobody. So the runner's `fetch` remembers who asked and
// answers nothing, and a test that asked anything fails once it ends, naming the address. A test stands in with
// `jest.spyOn(globalThis, 'fetch')` and an answer of its own; restoring its mocks brings this one back.
const asked: string[] = [];

/** The address a request names, in whichever form it was handed. */
const addressOf = (input: string | URL | Request): string => {
  if (typeof input === 'string') {
    return input;
  }
  return input instanceof URL ? input.href : input.url;
};

globalThis.fetch = async (input: string | URL | Request): Promise<Response> => {
  asked.push(addressOf(input));
  return Promise.reject(new TypeError('aucun test n’atteint le réseau'));
};

afterEach(() => {
  const addresses = asked.splice(0);
  if (addresses.length > 0) {
    throw new Error(`un test a demandé le réseau sans le remplacer : ${addresses.join(' ; ')}`);
  }
});
