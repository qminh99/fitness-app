export type Session = { id: string; exerciseId: string; status: 'active' | 'paused' | 'completed' | 'cancelled'; setsDone: number; restMs: number; restPausedMs: number | null; restSince: number | null; totalSets: number; startedAt: number; elapsedMs: number; activeSince: number | null; completedAt: number | null };
export type Snapshot = { schemaVersion: 1; sessions: Session[]; activeId: string | null };
export const emptySnapshot: Snapshot = { schemaVersion: 1, sessions: [], activeId: null };
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
function natural(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= 0; }
function isSession(value: unknown): value is Session {
  return record(value) && typeof value.id === 'string' && value.id.length > 0 && typeof value.exerciseId === 'string' && ['active', 'paused', 'completed', 'cancelled'].includes(String(value.status)) && natural(value.restMs) && (value.restPausedMs === null || natural(value.restPausedMs) && value.restPausedMs <= value.restMs) && (value.restSince === null || natural(value.restSince)) && natural(value.setsDone) && Number.isInteger(value.setsDone) && natural(value.totalSets) && value.totalSets > 0 && Number.isInteger(value.totalSets) && value.setsDone <= value.totalSets && natural(value.startedAt) && natural(value.elapsedMs) && (value.activeSince === null || natural(value.activeSince)) && (value.completedAt === null || natural(value.completedAt)) && (value.status === 'active' ? natural(value.activeSince) : value.activeSince === null) && (value.status === 'completed' ? natural(value.completedAt) && value.setsDone === value.totalSets : value.completedAt === null);
}
export function parseSnapshot(value: unknown): Snapshot {
  if (!record(value) || value.schemaVersion !== 1 || !Array.isArray(value.sessions) || !value.sessions.every(isSession) || !(value.activeId === null || typeof value.activeId === 'string')) throw new Error('Saved workout data could not be read. Your file has been preserved.');
  const sessions = value.sessions;
  const active = sessions.filter((session) => session.status === 'active' || session.status === 'paused');
  if (new Set(sessions.map((session) => session.id)).size !== sessions.length || active.length > 1 || (active[0]?.id ?? null) !== value.activeId) throw new Error('Saved workout data is inconsistent. Your file has been preserved.');
  return { schemaVersion: 1, sessions, activeId: value.activeId };
}
export function elapsed(session: Session, now = Date.now()) { return session.elapsedMs + (session.activeSince === null ? 0 : Math.max(0, now - session.activeSince)); }
export function changeSession(snapshot: Snapshot, id: string, action: 'set' | 'pause' | 'resume' | 'complete' | 'cancel' | 'skip-rest', now: number): Snapshot {
  const session = snapshot.sessions.find((item) => item.id === id);
  if (!session || session.status === 'completed' || session.status === 'cancelled') return snapshot;
  let updated = session;
  if (action === 'set' && session.status === 'active' && restRemaining(session, now) === 0 && session.setsDone < session.totalSets) updated = { ...session, setsDone: session.setsDone + 1, restSince: session.setsDone + 1 < session.totalSets ? now : null };
  if (action === 'skip-rest' && session.status === 'active') updated = { ...session, restSince: null };
  if (action === 'pause' && session.status === 'active') updated = { ...session, status: 'paused', restPausedMs: session.restSince === null ? null : restRemaining(session, now), elapsedMs: elapsed(session, now), activeSince: null };
  if (action === 'resume' && session.status === 'paused') updated = { ...session, status: 'active', restSince: session.restSince === null ? null : now - (session.restMs - (session.restPausedMs ?? session.restMs)), restPausedMs: null, activeSince: now };
  if (action === 'complete' && session.setsDone === session.totalSets) updated = { ...session, status: 'completed', elapsedMs: elapsed(session, now), activeSince: null, completedAt: now };
  if (action === 'cancel') updated = { ...session, status: 'cancelled', elapsedMs: elapsed(session, now), activeSince: null };
  if (updated === session) return snapshot;
  return { ...snapshot, activeId: updated.status === 'completed' || updated.status === 'cancelled' ? null : snapshot.activeId, sessions: snapshot.sessions.map((item) => item.id === id ? updated : item) };
}

export function restRemaining(session: Session, now = Date.now()) { return session.restSince === null ? 0 : session.status === 'paused' ? session.restPausedMs ?? 0 : Math.max(0, session.restMs - Math.max(0, now - session.restSince)); }
export function startSession(snapshot: Snapshot, exerciseId: string, totalSets: number, restMs: number, id: string, now: number): Snapshot {
  if (snapshot.activeId) return snapshot;
  return { ...snapshot, activeId: id, sessions: [...snapshot.sessions, { id, exerciseId, status: 'active', setsDone: 0, totalSets, restMs, restPausedMs: null, restSince: null, startedAt: now, elapsedMs: 0, activeSince: now, completedAt: null }] };
}
