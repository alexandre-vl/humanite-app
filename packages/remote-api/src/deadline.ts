/**
 * The one deadline this client keeps, and the way it keeps it, for every request it makes.
 *
 * The platform gives a request no limit of its own: the OkHttp client React Native configures sets connect, read and
 * write to zero. So the limit is this client's, raced against the request rather than left to a platform to honour,
 * and the request is let go when it passes — a connection held is one of the five a host allows the app at once.
 *
 * It lives in a module of its own rather than beside the reads, because the call that was written without it was the
 * one that could least afford to be: a reading that never comes back leaves a screen loading, which a reader can
 * leave; a login that never comes back leaves the reader signed out with the only button that could sign them in
 * saying it is already trying.
 */

/**
 * How long a request is given before it is let go: fifteen seconds.
 *
 * A section's list the service had to build took 4.4 to 6.1 seconds on eight cold reads out of thirteen in a capture,
 * so the limit leaves two and a half times the slowest thing the service was seen to do.
 */
export const DEADLINE = 15_000;

/** What keeping a deadline needs of the platform: a way to call a request off, and a way to run something later. */
export type Deadline<Signal> = Readonly<{
  /** One request's way out: the signal that goes with it, and what lets it go. */
  abortable: () => Readonly<{ signal: Signal; abort: () => void }>;
  /** Runs `then` once `delay` milliseconds have passed, and answers with what cancels it. */
  after: (delay: number, then: () => void) => () => void;
}>;

/**
 * What `work` answers, or the error `late` names when the deadline passes first — and, either way, a request that is
 * no longer on its way.
 *
 * The signal is handed to `work` rather than reached for: it is whatever the platform cancels a request by, and this
 * never looks inside it. Whoever loses the race is cancelled, and the timer is cancelled whoever wins, so a read that
 * came back in one second does not hold a timer for fourteen more.
 */
export const beforeDeadline = async <Signal, Value>(
  ports: Deadline<Signal>,
  late: () => Error,
  work: (signal: Signal) => Promise<Value>,
): Promise<Value> => {
  const control = ports.abortable();
  let cancel = (): void => undefined;
  const passed = new Promise<never>((...[, reject]) => {
    cancel = ports.after(DEADLINE, () => {
      control.abort();
      reject(late());
    });
  });
  return Promise.race([work(control.signal), passed]).finally(cancel);
};
