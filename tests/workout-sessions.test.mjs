import assert from 'node:assert/strict';
import test from 'node:test';

import { changeSession, elapsed, emptySnapshot, parseSnapshot, restRemaining, startSession } from '../src/modules/workout-sessions/model.ts';
import { createSessionWriter } from '../src/modules/workout-sessions/writer.ts';

const initial = () => startSession(emptySnapshot, 'bodyweight-squat', 2, 30000, 'session-1', 1000);

test('double start and reentry preserve the same active session', () => {
  const first = initial();
  const second = startSession(first, 'wall-push-up', 2, 30000, 'session-2', 2000);
  assert.equal(second, first);
  const reopened = parseSnapshot(JSON.parse(JSON.stringify(second)));
  assert.equal(startSession(reopened, 'wall-push-up', 2, 30000, 'session-3', 3000).activeId, 'session-1');
  assert.equal(reopened.sessions.length, 1);
});

test('sets cannot complete while paused or during rest; skip rest is explicit', () => {
  const firstSet = changeSession(initial(), 'session-1', 'set', 2000);
  assert.equal(firstSet.sessions[0].setsDone, 1);
  assert.equal(restRemaining(firstSet.sessions[0], 3000), 29000);
  assert.equal(changeSession(firstSet, 'session-1', 'set', 3000), firstSet);
  const paused = changeSession(firstSet, 'session-1', 'pause', 3000);
  assert.equal(changeSession(paused, 'session-1', 'set', 30000), paused);
  assert.equal(restRemaining(paused.sessions[0], 90000), 29000);
  assert.equal(elapsed(paused.sessions[0], 90000), 2000);
  const resumed = changeSession(paused, 'session-1', 'resume', 90000);
  assert.equal(restRemaining(resumed.sessions[0], 91000), 28000);
  const skipped = changeSession(resumed, 'session-1', 'skip-rest', 91000);
  const allSets = changeSession(skipped, 'session-1', 'set', 92000);
  assert.equal(allSets.sessions[0].setsDone, 2);
});

test('complete requires every set and repeated complete creates one history entry', () => {
  let state = initial();
  assert.equal(changeSession(state, 'session-1', 'complete', 2000), state);
  state = changeSession(state, 'session-1', 'set', 2000);
  state = changeSession(state, 'session-1', 'set', 32000);
  state = changeSession(state, 'session-1', 'complete', 33000);
  for (let i = 0; i < 20; i++) state = changeSession(state, 'session-1', 'complete', 34000);
  const reopened = parseSnapshot(JSON.parse(JSON.stringify(state)));
  assert.equal(reopened.activeId, null);
  assert.equal(reopened.sessions.filter((session) => session.status === 'completed').length, 1);
  assert.equal(changeSession(reopened, 'session-1', 'cancel', 35000), reopened);
  assert.equal(startSession(reopened, 'wall-push-up', 2, 30000, 'session-2', 35000).sessions.length, 2);
});

test('cancel is terminal and never enters completed history', () => {
  const cancelled = changeSession(initial(), 'session-1', 'cancel', 3000);
  assert.equal(cancelled.activeId, null);
  assert.equal(cancelled.sessions[0].status, 'cancelled');
  assert.equal(changeSession(cancelled, 'session-1', 'resume', 4000), cancelled);
  assert.equal(changeSession(cancelled, 'session-1', 'complete', 4000), cancelled);
});

test('schema boundary rejects corrupted, duplicate and inconsistent snapshots', () => {
  assert.throws(() => parseSnapshot({ schemaVersion: 2, sessions: [], activeId: null }));
  assert.throws(() => parseSnapshot({ ...initial(), activeId: 'missing' }));
  const session = initial().sessions[0];
  assert.throws(() => parseSnapshot({ ...initial(), sessions: [session, session] }));
  assert.throws(() => parseSnapshot({ ...initial(), sessions: [{ ...session, setsDone: -1 }] }));
  assert.throws(() => parseSnapshot({ ...initial(), sessions: [{ ...session, status: 'completed' }] }));
});

test('failed persistence never publishes success; retry uses same ID and queue recovers', async () => {
  let state = initial();
  let writes = 0;
  let published = 0;
  const commit = createSessionWriter(() => state, async () => { writes++; if (writes === 1) throw new Error('disk full'); }, (next) => { state = next; published++; });
  await assert.rejects(commit((previous) => changeSession(previous, 'session-1', 'set', 2000)), /disk full/);
  assert.equal(published, 0);
  assert.equal(state.sessions[0].setsDone, 0);
  await commit((previous) => changeSession(previous, 'session-1', 'set', 2000));
  assert.equal(state.sessions[0].setsDone, 1);
  assert.equal(state.activeId, 'session-1');
  assert.equal(published, 1);
});

test('serialized concurrent starts and finishes preserve single business session', async () => {
  let state = emptySnapshot;
  const commit = createSessionWriter(() => state, async () => {}, (next) => { state = next; });
  await Promise.all(Array.from({ length: 20 }, (_, index) => commit((previous) => startSession(previous, 'bodyweight-squat', 2, 30000, `session-${index}`, 1000))));
  assert.equal(state.sessions.length, 1);
  const id = state.activeId;
  await commit((previous) => changeSession(previous, id, 'set', 2000));
  await commit((previous) => changeSession(previous, id, 'set', 32000));
  await Promise.all(Array.from({ length: 20 }, () => commit((previous) => changeSession(previous, id, 'complete', 33000))));
  assert.equal(state.sessions.length, 1);
  assert.equal(state.sessions[0].status, 'completed');
  assert.equal(state.activeId, null);
});


test('pause before first set preserves configured rest; later rest periods retain full duration', () => {
  let state = startSession(emptySnapshot, 'bodyweight-squat', 3, 30000, 'session-1', 1000);
  state = changeSession(state, 'session-1', 'pause', 2000);
  state = changeSession(state, 'session-1', 'resume', 3000);
  state = changeSession(state, 'session-1', 'set', 4000);
  assert.equal(restRemaining(state.sessions[0], 4000), 30000);
  state = changeSession(state, 'session-1', 'pause', 14000);
  state = changeSession(state, 'session-1', 'resume', 20000);
  assert.equal(restRemaining(state.sessions[0], 20000), 20000);
  state = changeSession(state, 'session-1', 'set', 40000);
  assert.equal(restRemaining(state.sessions[0], 40000), 30000);
});
