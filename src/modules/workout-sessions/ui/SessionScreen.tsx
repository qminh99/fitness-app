import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { getExercise } from '@/modules/exercise-catalog';
import { AppText, Button, colors, Screen } from '@/ui';

import { useSessions } from '../index';
import { elapsed, restRemaining } from '../model';

function clock(ms: number) { const seconds = Math.floor(ms / 1000); return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`; }
type Props = { id: string; onProgress: () => void; onTrain: () => void };
export function SessionScreen({ id, onProgress, onTrain }: Props) {
  const { snapshot, command } = useSessions();
  const session = snapshot.sessions.find((item) => item.id === id);
  const [now, setNow] = useState(Date.now);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(timer); }, []);
  const act = async (action: Parameters<typeof command>[1]) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(null);
    try { await command(id, action); setNow(Date.now()); } catch { setError('Your change could not be saved. Check device storage, then try the action again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  if (!session) return <Screen hasNavigationHeader><AppText variant="title">Session unavailable</AppText><Button label="Back to Train" onPress={onTrain} /></Screen>;
  const exercise = getExercise(session.exerciseId);
  if (!exercise) return <Screen hasNavigationHeader><AppText variant="title">Exercise unavailable</AppText><Button label="Back to Train" onPress={onTrain} /></Screen>;
  if (session.status === 'cancelled') return <Screen hasNavigationHeader><AppText variant="title">Session ended</AppText><AppText tone="secondary">This session was not added to your completed workouts.</AppText><Button label="Back to Train" onPress={onTrain} /></Screen>;
  if (session.status === 'completed') return <Screen hasNavigationHeader>
    <View style={styles.success}><Ionicons name="checkmark-circle" size={72} color={colors.action} accessible={false} /><AppText variant="label" style={styles.accent}>SAVED ON THIS DEVICE</AppText><AppText variant="screenTitle" style={styles.center}>You showed up.</AppText><AppText tone="secondary" style={styles.center}>That’s how momentum starts. Nice work.</AppText></View>
    <View style={styles.card}><AppText variant="heading">{exercise.name}</AppText><View style={styles.summaryStats}><View style={styles.summaryItem}><AppText variant="title">{clock(elapsed(session))}</AppText><AppText tone="secondary">session time</AppText></View><View style={styles.summaryItem}><AppText variant="title">{session.setsDone}</AppText><AppText tone="secondary">sets done</AppText></View></View><AppText variant="caption" tone="secondary">Includes rest time while the session was running. Activity is self-reported.</AppText></View>
    <Button label="See your progress" onPress={onProgress} /><View style={styles.gap}><Button label="Back to Train" onPress={onTrain} /></View>
  </Screen>;
  const resting = restRemaining(session, now);
  const allDone = session.setsDone >= session.totalSets;
  const paused = session.status === 'paused';
  return <Screen hasNavigationHeader>
    <AppText variant="label" style={styles.accent}>YOUR SESSION · {paused ? 'PAUSED' : resting > 0 ? 'RECOVER' : 'LET’S MOVE'}</AppText><AppText variant="title" style={styles.title}>{exercise.name}</AppText><AppText tone="secondary">{exercise.focus} · {exercise.reps} per set</AppText>
    <View style={styles.timerCard}><AppText variant="label" tone="secondary">{paused ? 'PAUSED TIME' : 'SESSION TIME'}</AppText><AppText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4} style={styles.timer} accessibilityLabel={`${clock(elapsed(session, now))} session time`}>{clock(elapsed(session, now))}</AppText><View style={styles.track}><View style={[styles.fill, { width: `${session.setsDone / session.totalSets * 100}%` }]} /></View><AppText variant="label">{session.setsDone} of {session.totalSets} sets complete</AppText></View>
    <View style={styles.card}><View style={styles.row}><Ionicons name={allDone ? 'checkmark-circle-outline' : 'body-outline'} size={28} color={colors.action} accessible={false} /><AppText variant="heading" style={styles.flex}>{allDone ? 'All sets complete' : `Set ${session.setsDone + 1} of ${session.totalSets}`}</AppText></View><AppText tone="secondary">{allDone ? 'Take a breath. Finish your session to save it to your history.' : paused ? 'Your session and rest timer are paused. Resume whenever you are ready.' : resting > 0 ? `Rest for ${Math.ceil(resting / 1000)} seconds. Find your breath before your next set.` : `Complete ${exercise.reps} at a comfortable pace, then mark your set below.`}</AppText>
      {resting > 0 && <AppText style={styles.restTime}>{clock(resting)}</AppText>}
      {!allDone && <Button label={busy ? 'Saving…' : 'Mark set complete'} disabled={busy || paused || resting > 0} onPress={() => { void act('set'); }} />}
      {resting > 0 && !paused && <Button label="Skip remaining rest" disabled={busy} onPress={() => { void act('skip-rest'); }} />}
      {allDone && <Button label={busy ? 'Saving your session…' : 'Finish & save session'} disabled={busy} onPress={() => { void act('complete'); }} />}
    </View>
    <Button label={paused ? 'Resume session' : 'Pause session'} disabled={busy} onPress={() => { void act(paused ? 'resume' : 'pause'); }} />
    {error && <AppText accessibilityRole="alert" style={styles.error}>{error}</AppText>}
    <AppText variant="caption" tone="secondary" style={styles.hint}>Your sets are saved as you go. Leaving this screen keeps the session available in Train. Running timers continue in the background; pause to take a break.</AppText>
    <View style={styles.gap}><Button label="End without completing" disabled={busy} onPress={() => Alert.alert('End this session?', 'Your unfinished session will not appear in completed history.', [{ text: 'Keep training', style: 'cancel' }, { text: 'End session', style: 'destructive', onPress: () => { void act('cancel'); } }])} /></View>
  </Screen>;
}
const styles = StyleSheet.create({ accent: { color: colors.action }, title: { marginTop: 12, marginBottom: 8 }, timerCard: { backgroundColor: colors.accentSurface, borderRadius: 24, padding: 24, marginVertical: 24, alignItems: 'center', gap: 12 }, timer: { width: '100%', textAlign: 'center', fontSize: 58, lineHeight: 70, fontWeight: '700', fontVariant: ['tabular-nums'], color: colors.textPrimary }, restTime: { fontSize: 40, lineHeight: 52, fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'center', color: colors.action }, track: { height: 8, width: '100%', backgroundColor: colors.surface, borderRadius: 4, overflow: 'hidden' }, fill: { height: '100%', backgroundColor: colors.action }, card: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, gap: 16, marginBottom: 20 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, flex: { flex: 1 }, error: { marginTop: 16, color: colors.action }, hint: { marginTop: 20 }, gap: { marginTop: 12 }, success: { alignItems: 'center', gap: 16, paddingVertical: 32 }, center: { textAlign: 'center' }, summaryStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 }, summaryItem: { flexGrow: 1, gap: 4 } });
