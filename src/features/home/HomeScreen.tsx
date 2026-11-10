import { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import Svg, { Circle } from "react-native-svg";

import { getExercise } from "@/modules/exercise-catalog";
import { elapsed, useSessions } from "@/modules/workout-sessions";

type HomeScreenProps = {
  /** Replace this placeholder with the name from your authenticated user profile. */
  userName?: string;
  dailyGoalMinutes?: number;
};

type CalendarDay = {
  date: Date;
  belongsToCurrentMonth: boolean;
};

const ACCENT = "#F0785A";
const COMPLETED = "#22A06B";
const RING_SIZE = 164;
const RING_STROKE = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function buildCalendarDays(month: Date): CalendarDay[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const startOffset = firstDayOfMonth.getDay(); // Sunday = 0
  const gridStart = new Date(year, monthIndex, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
    );

    return {
      date,
      belongsToCurrentMonth: date.getMonth() === monthIndex,
    };
  });
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatSelectedDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

function toLocalDateKey(date: Date): string {
  return date.toDateString();
}

const minuteFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function formatMinutes(minutes: number): string {
  return minutes > 0 && minutes < 0.05 ? "<0.1" : minuteFormatter.format(minutes);
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default function HomeScreen({
  userName = "there",
  dailyGoalMinutes = 60,
}: HomeScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark
    ? {
        background: "#111315",
        surface: "#1B1F22",
        surfaceAlt: "#252A2E",
        text: "#F4F5F6",
        muted: "#A4ADB4",
        border: "#343B40",
        ringTrack: "#394147",
      }
    : {
        background: "#FAF8F6",
        surface: "#FFFFFF",
        surfaceAlt: "#F2EFEC",
        text: "#242424",
        muted: "#777777",
        border: "#E8E2DD",
        ringTrack: "#E9E5E1",
      };

  const { snapshot } = useSessions();
  const [displayedMonth, setDisplayedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [todayKey, setTodayKey] = useState(() => toLocalDateKey(new Date()));

  useFocusEffect(useCallback(() => {
    setTodayKey(toLocalDateKey(new Date()));
  }, []));

  const calendarDays = useMemo(
    () => buildCalendarDays(displayedMonth),
    [displayedMonth],
  );

  const workoutsByDay = useMemo(() => {
    const completed = snapshot.sessions
      .filter((session): session is typeof session & { completedAt: number } =>
        session.status === "completed" && session.completedAt !== null,
      )
      .sort((a, b) => a.completedAt - b.completedAt);
    const byDay = new Map<string, typeof completed>();
    for (const workout of completed) {
      const day = toLocalDateKey(new Date(workout.completedAt));
      const workouts = byDay.get(day);
      if (workouts) workouts.push(workout);
      else byDay.set(day, [workout]);
    }
    return byDay;
  }, [snapshot.sessions]);

  const selectedDayKey = toLocalDateKey(selectedDate);
  const selectedWorkouts = workoutsByDay.get(selectedDayKey) ?? [];
  const todayMs = workoutsByDay.get(todayKey)?.reduce((total, workout) => total + elapsed(workout), 0) ?? 0;
  const todayMinutes = todayMs / 60_000;
  const todayMinutesLabel = formatMinutes(todayMinutes);
  const safeGoal = Math.max(1, dailyGoalMinutes);
  const progress = Math.min(todayMinutes / safeGoal, 1);
  const strokeDashOffset = RING_CIRCUMFERENCE * (1 - progress);
  const displayName = userName.trim() || "there";

  const changeMonth = (amount: number) => {
    setDisplayedMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  };

  const selectDay = (date: Date) => {
    setSelectedDate(date);
    if (date.getMonth() !== displayedMonth.getMonth() || date.getFullYear() !== displayedMonth.getFullYear()) {
      setDisplayedMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Image
            source={require('../../../assets/images/fitness-app-logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Fitness App Logo"
          />
        </View>

        <View style={styles.greetingBlock}>
          <Text style={[styles.greeting, { color: colors.text }]}>Hi, {displayName}!</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Let&apos;s start a workout.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Workout Calendar</Text>
            <View style={styles.monthControls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                onPress={() => changeMonth(-1)}
                style={[styles.monthButton, { backgroundColor: colors.surfaceAlt }]}
              >
                <Text style={[styles.monthArrow, { color: colors.text }]}>‹</Text>
              </Pressable>
              <Text style={[styles.monthLabel, { color: colors.text }]}>{formatMonth(displayedMonth)}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next month"
                onPress={() => changeMonth(1)}
                style={[styles.monthButton, { backgroundColor: colors.surfaceAlt }]}
              >
                <Text style={[styles.monthArrow, { color: colors.text }]}>›</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.weekHeader}>
            {(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const).map((day) => (
              <Text key={day} style={[styles.weekday, { color: colors.muted }]}>{day}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map(({ date, belongsToCurrentMonth }) => {
              const dateKey = toLocalDateKey(date);
              const isSelected = dateKey === selectedDayKey;
              const isToday = dateKey === todayKey;
              const hasWorkout = workoutsByDay.has(dateKey);

              return (
                <View key={dateKey} style={styles.dayCell}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${formatSelectedDate(date)}${hasWorkout ? ", workout completed" : ""}`}
                    onPress={() => selectDay(date)}
                    style={[
                      styles.dayButton,
                      isSelected && { backgroundColor: `${ACCENT}20` },
                      isToday && !isSelected && { borderColor: ACCENT, borderWidth: 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        { color: belongsToCurrentMonth ? colors.text : colors.muted },
                        !belongsToCurrentMonth && styles.outsideMonthDay,
                        isSelected && { color: ACCENT, fontWeight: "800" },
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                    <View style={styles.dayMarkerSlot}>
                      {hasWorkout ? <View style={styles.completedDot} /> : null}
                    </View>
                  </Pressable>
                </View>
              );
            })}
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendDot} />
            <Text style={[styles.legendText, { color: colors.muted }]}>Workout completed</Text>
            <View style={styles.todayLegend} />
            <Text style={[styles.legendText, { color: colors.muted }]}>Today</Text>
          </View>

          <View style={[styles.selectedDayPanel, { backgroundColor: colors.surfaceAlt }]}>
            <Text style={[styles.selectedDayTitle, { color: colors.text }]}>
              {formatSelectedDate(selectedDate)}
            </Text>
            {selectedWorkouts.length > 0 ? (
              selectedWorkouts.map((workout) => (
                <View key={workout.id} style={styles.workoutRow}>
                  <View style={styles.workoutIcon}>
                    <Text style={styles.workoutIconText}>✓</Text>
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text style={[styles.workoutName, { color: colors.text }]}>{getExercise(workout.exerciseId)?.name ?? "Workout"}</Text>
                    <Text style={[styles.workoutMeta, { color: colors.muted }]}>
                      {formatTime(workout.startedAt)} · {formatMinutes(elapsed(workout) / 60_000)} min
                    </Text>
                  </View>
                  <Text style={styles.completedLabel}>Done</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                {selectedDayKey === todayKey
                  ? "No workouts logged today yet."
                  : "No workouts logged for this day."}
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.card, styles.activityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Today&apos;s Activity</Text>
          <View style={styles.ringWrap}>
            <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={colors.ringTrack}
                strokeWidth={RING_STROKE}
                fill="none"
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={ACCENT}
                strokeWidth={RING_STROKE}
                strokeLinecap="round"
                strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
                strokeDashoffset={strokeDashOffset}
                rotation={-90}
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                fill="none"
              />
            </Svg>
            <View pointerEvents="none" style={styles.ringCenter}>
              <Text style={[styles.ringNumber, { color: colors.text }]}>{todayMinutesLabel}</Text>
              <Text style={[styles.ringUnit, { color: colors.muted }]}>MINUTES</Text>
            </View>
          </View>
          <Text style={[styles.goalText, { color: colors.text }]}>
            {todayMinutesLabel} / {safeGoal} min
          </Text>
          <Text style={[styles.goalCaption, { color: colors.muted }]}>Daily workout goal</Text>
          <View style={[styles.progressTrack, { backgroundColor: colors.ringTrack }]}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={[styles.progressCaption, { color: colors.muted }]}>
            {Math.round((todayMinutes / safeGoal) * 100)}% of your daily goal
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36, gap: 18 },
  headerRow: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logo: { width: 64, height: 64, borderRadius: 16 },
  greetingBlock: { gap: 5, paddingTop: 2, paddingBottom: 2 },
  greeting: { fontSize: 29, fontWeight: "800", letterSpacing: -0.7 },
  subtitle: { fontSize: 16, fontWeight: "500" },
  card: { borderRadius: 22, borderWidth: 1, padding: 16, gap: 16 },
  sectionHeader: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  monthControls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  monthButton: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  monthArrow: { fontSize: 26, lineHeight: 28, marginTop: -3 },
  monthLabel: { fontSize: 15, fontWeight: "700", minWidth: 130, textAlign: "center" },
  weekHeader: { flexDirection: "row" },
  weekday: { width: `${100 / 7}%`, textAlign: "center", fontSize: 11, fontWeight: "700" },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 4 },
  dayCell: { width: `${100 / 7}%`, paddingHorizontal: 1 },
  dayButton: { minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "transparent", gap: 2 },
  dayNumber: { fontSize: 13, fontWeight: "600" },
  outsideMonthDay: { opacity: 0.42 },
  dayMarkerSlot: { height: 6, alignItems: "center", justifyContent: "center" },
  completedDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COMPLETED },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 7, paddingTop: 2 },
  legendDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COMPLETED },
  legendText: { fontSize: 11 },
  todayLegend: { width: 10, height: 10, borderRadius: 3, borderWidth: 1, borderColor: ACCENT, marginLeft: 9 },
  selectedDayPanel: { borderRadius: 15, padding: 12, gap: 10 },
  selectedDayTitle: { fontSize: 13, fontWeight: "800" },
  workoutRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  workoutIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: `${COMPLETED}18`, alignItems: "center", justifyContent: "center" },
  workoutIconText: { color: COMPLETED, fontWeight: "900", fontSize: 15 },
  workoutInfo: { flex: 1, gap: 3 },
  workoutName: { fontSize: 13, fontWeight: "700" },
  workoutMeta: { fontSize: 11 },
  completedLabel: { color: COMPLETED, fontSize: 11, fontWeight: "800" },
  emptyText: { fontSize: 12, lineHeight: 18 },
  activityCard: { alignItems: "center", paddingVertical: 20 },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center", marginTop: 2 },
  ringCenter: { position: "absolute", alignItems: "center", justifyContent: "center" },
  ringNumber: { fontSize: 34, fontWeight: "900", letterSpacing: -1 },
  ringUnit: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, marginTop: -1 },
  goalText: { fontSize: 17, fontWeight: "800", marginTop: -2 },
  goalCaption: { fontSize: 12, marginTop: -10 },
  progressTrack: { width: "100%", height: 7, borderRadius: 8, overflow: "hidden", marginTop: 2 },
  progressFill: { height: "100%", backgroundColor: ACCENT, borderRadius: 8 },
  progressCaption: { fontSize: 11, marginTop: -8 },
});
