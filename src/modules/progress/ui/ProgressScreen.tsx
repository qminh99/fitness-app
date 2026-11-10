import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { getExercise } from '@/modules/exercise-catalog';
import { elapsed, useSessions } from '@/modules/workout-sessions';
import { AppText, Button, colors, Screen } from '@/ui';

type ProgressScreenProps = { onExploreTrain: () => void };
export function ProgressScreen({ onExploreTrain }: ProgressScreenProps) {
  const { snapshot } = useSessions();
  const completed = snapshot.sessions.filter((session) => session.status === 'completed').sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const totalMs = completed.reduce((sum, session) => sum + elapsed(session), 0);
  const sets = completed.reduce((sum, session) => sum + session.setsDone, 0);
  return <Screen>
    <AppText variant="label" style={styles.accent}>EVERY SESSION COUNTS</AppText><AppText variant="screenTitle" style={styles.title}>Your momentum.</AppText><AppText tone="secondary">A record of showing up for yourself.</AppText>
    <View style={styles.hero}><Ionicons name="bar-chart-outline" size={36} color={colors.onAction} accessible={false} /><AppText style={styles.bigNumber}>{completed.length}</AppText><AppText style={styles.white}>sessions completed</AppText><AppText variant="caption" style={styles.white}>{completed.length ? 'Small steps add up. Keep your own pace.' : 'Your next chapter starts with one session.'}</AppText></View>
    <View style={styles.stats}><View style={styles.stat}><AppText variant="title">{sets}</AppText><AppText variant="caption" tone="secondary">sets completed</AppText></View><View style={styles.stat}><AppText variant="title">{Math.floor(totalMs / 60000)}m {Math.floor(totalMs / 1000) % 60}s</AppText><AppText variant="caption" tone="secondary">total session time</AppText></View></View>
    <View style={styles.heading}><AppText variant="heading">Workout history</AppText><AppText variant="caption" tone="secondary">Saved on this device</AppText></View>
    {!completed.length && <View style={styles.empty}><Ionicons name="footsteps-outline" size={40} color={colors.action} accessible={false} /><AppText variant="heading">Make your first move</AppText><AppText tone="secondary">Finish a session and your results will appear here.</AppText><Button label="Find a workout" onPress={onExploreTrain} /></View>}
    {completed.map((session) => <View key={session.id} style={styles.history}><View style={styles.historyTop}><View style={styles.historyTitle}><AppText variant="bodyStrong">{getExercise(session.exerciseId)?.name ?? 'Workout'}</AppText><AppText variant="caption" tone="secondary">{new Date(session.completedAt ?? session.startedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</AppText></View><Ionicons name="checkmark-circle" size={24} color={colors.action} accessible={false} /></View><AppText variant="caption" tone="secondary">{session.setsDone} sets · {Math.floor(elapsed(session) / 60000)}m {Math.floor(elapsed(session) / 1000) % 60}s · Completed</AppText></View>)}
    <AppText variant="caption" tone="secondary" style={styles.foot}>Self-reported workouts. Session time includes rests while running and excludes paused time. No account or cloud sync.</AppText>
  </Screen>;
}
const styles = StyleSheet.create({ accent: { color: colors.action }, title: { marginTop: 12, marginBottom: 8 }, hero: { backgroundColor: colors.textPrimary, borderRadius: 24, padding: 24, marginTop: 24, gap: 12 }, bigNumber: { fontSize: 64, lineHeight: 76, fontWeight: '700', color: colors.onAction }, white: { color: colors.onAction }, stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }, stat: { flexGrow: 1, backgroundColor: colors.surface, borderRadius: 20, padding: 20, gap: 4 }, heading: { marginTop: 32, marginBottom: 16, gap: 4 }, empty: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, gap: 16 }, history: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 12, marginBottom: 12 }, historyTop: { flexDirection: 'row', alignItems: 'center', gap: 12 }, historyTitle: { flex: 1, gap: 6 }, foot: { marginTop: 20 } });
