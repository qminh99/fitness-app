import type { Snapshot } from './model';

// All commands read the latest successfully saved state inside the same queue.
// A failed save never publishes its draft and does not poison subsequent retries.
export function createSessionWriter(read: () => Snapshot, write: (snapshot: Snapshot) => Promise<void>, publish: (snapshot: Snapshot) => void) {
  let queue = Promise.resolve();
  return (update: (snapshot: Snapshot) => Snapshot) => {
    const work = queue.then(async () => {
      const previous = read();
      const next = update(previous);
      if (next === previous) return;
      await write(next);
      publish(next);
    });
    queue = work.catch(() => undefined);
    return work;
  };
}
