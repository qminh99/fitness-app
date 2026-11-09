import * as FileSystem from 'expo-file-system/legacy';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { getExercise } from '@/modules/exercise-catalog';
import { AppText, Button, Screen } from '@/ui';

import { createSessionWriter } from './writer';
import { changeSession, emptySnapshot, parseSnapshot, startSession, type Snapshot } from './model';
export { elapsed, restRemaining, type Session } from './model';

type SessionsContext = { snapshot: Snapshot; start: (exerciseId: string) => Promise<string>; command: (id: string, action: 'set' | 'pause' | 'resume' | 'complete' | 'cancel' | 'skip-rest') => Promise<void> };
const Context = createContext<SessionsContext | null>(null);
export function SessionsProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const current = useRef(snapshot);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const path = `${FileSystem.documentDirectory}fitness-sessions-v1.json`;
  const load = useCallback(async () => {
    try {
      const info = await FileSystem.getInfoAsync(path);
      setError(null);
      const loaded = info.exists ? parseSnapshot(JSON.parse(await FileSystem.readAsStringAsync(path))) : emptySnapshot;
      if (loaded.sessions.some((session) => !getExercise(session.exerciseId))) throw new Error('A saved exercise is unavailable. Your data has been preserved.');
      current.current = loaded; setSnapshot(loaded); setReady(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not read local data.'); }
  }, [path]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const writer = useRef<ReturnType<typeof createSessionWriter> | null>(null);
  const commit = (update: (previous: Snapshot) => Snapshot) => {
    if (!writer.current) writer.current = createSessionWriter(
      () => current.current,
      // Bundled iOS uses Data.write(options: .atomic). moveAsync deletes first.
      async (next) => { await FileSystem.writeAsStringAsync(path, JSON.stringify(next)); },
      (next) => { current.current = next; setSnapshot(next); },
    );
    return writer.current(update);
  };
  const start = async (exerciseId: string) => {
    let id = '';
    await commit((previous) => {
      if (previous.activeId) { id = previous.activeId; return previous; }
      const exercise = getExercise(exerciseId);
      if (!exercise) throw new Error('Exercise not found.');
      const now = Date.now(); id = `${now}-${Math.random().toString(36).slice(2)}`;
      return startSession(previous, exerciseId, exercise.sets, exercise.rest * 1000, id, now);
    });
    return id;
  };
  const command: SessionsContext['command'] = async (id, action) => { await commit((previous) => changeSession(previous, id, action, Date.now())); };
  if (!ready) return <Screen><AppText variant="title">{error ? 'Unable to open saved workouts' : 'Getting your training ready…'}</AppText>{error && <><AppText>{error}</AppText><Button label="Try again" onPress={() => { void load(); }} /></>}</Screen>;
  return <Context.Provider value={{ snapshot, start, command }}>{children}</Context.Provider>;
}
export function useSessions() { const value = useContext(Context); if (!value) throw new Error('SessionsProvider is required.'); return value; }
export { SessionScreen } from './ui/SessionScreen';
