/** Retries `fn` up to `maxAttempts` times with a short linear backoff, then
 *  gives up and logs — never rethrows. This is what onWrite triggers should
 *  use instead of the Eventarc-level `retry: true` option: that one retries
 *  a genuinely failing invocation for up to 7 days, which turns any bug that
 *  makes the function always throw into a runaway write loop (that's what
 *  happened with the Timestamp instanceof bug — every write was retried
 *  near-instantly, forever). Bounded, in-process retries still self-heal a
 *  transient blip (a momentary contention on the transaction, a brief
 *  network hiccup), but a persistent failure stops on its own after
 *  `maxAttempts` instead of hammering Firestore indefinitely. Any doc that
 *  genuinely ends up stale because of this can still be fixed via the manual
 *  "recalcular" button or the backfill script. */
export async function withBoundedRetries(
  label: string,
  fn: () => Promise<void>,
  maxAttempts = 4
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await fn();
      return;
    } catch (err) {
      if (attempt === maxAttempts) {
        console.error(`${label} failed after ${maxAttempts} attempts, giving up`, err);
        return;
      }
      console.warn(`${label} failed (attempt ${attempt}/${maxAttempts}), retrying`, err);
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    }
  }
}
