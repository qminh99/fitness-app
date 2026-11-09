import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

import {
  getWorkoutHistory,
  getWorkoutMinutesForDate,
  getWorkoutsForDate,
  toLocalDateKey,
} from "../workouts/workout-history";
import type { CompletedWorkout } from "../workouts/workout-history";

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

function formatTime(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoDate));
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

  const [history, setHistory] = useState<CompletedWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [displayedMonth, setDisplayedMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const refreshHistory = useCallback(async () => {
    try {
      setLoadError(null);
      const storedHistory = await getWorkoutHistory();
      setHistory(storedHistory);
    } catch {
      setLoadError("Workout history could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh whenever the user returns to the Home tab.
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        try {
          setLoadError(null);
          const storedHistory = await getWorkoutHistory();
          if (isActive) setHistory(storedHistory);
        } catch {
          if (isActive) {
            setLoadError("Workout history could not be loaded. Please try again.");
          }
        } finally {
          if (isActive) setLoading(false);
        }
      };

      void load();
      return () => {
        isActive = false;
      };
    }, []),
  );

  const calendarDays = useMemo(
    () => buildCalendarDays(displayedMonth),
    [displayedMonth],
  );

  const completedDateKeys = useMemo(
    () => new Set(history.map((workout) => toLocalDateKey(new Date(workout.completedAt)))),
    [history],
  );

  const selectedWorkouts = useMemo(
    () => getWorkoutsForDate(history, selectedDate),
    [history, selectedDate],
  );

  const todayMinutes = getWorkoutMinutesForDate(history, new Date());
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
          <Text style={[styles.subtitle, { color: colors.muted }]}>Let's start a workout.</Text>
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
              const isSelected = dateKey === toLocalDateKey(selectedDate);
              const isToday = dateKey === toLocalDateKey(new Date());
              const hasWorkout = completedDateKeys.has(dateKey);

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
            {loading ? (
              <ActivityIndicator color={ACCENT} style={styles.inlineLoader} />
            ) : loadError ? (
              <View style={styles.errorRow}>
                <Text style={[styles.emptyText, { color: colors.muted }]}>{loadError}</Text>
                <Pressable onPress={() => void refreshHistory()}>
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              </View>
            ) : selectedWorkouts.length > 0 ? (
              selectedWorkouts.map((workout) => (
                <View key={workout.id} style={styles.workoutRow}>
                  <View style={styles.workoutIcon}>
                    <Text style={styles.workoutIconText}>✓</Text>
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text style={[styles.workoutName, { color: colors.text }]}>{workout.workoutName}</Text>
                    <Text style={[styles.workoutMeta, { color: colors.muted }]}>
                      {formatTime(workout.startedAt)} · {workout.durationMinutes} min
                    </Text>
                  </View>
                  <Text style={styles.completedLabel}>Done</Text>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                {toLocalDateKey(selectedDate) === toLocalDateKey(new Date())
                  ? "No workouts logged today yet."
                  : "No workouts logged for this day."}
              </Text>
            )}
          </View>
        </View>

        <View style={[styles.card, styles.activityCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Activity</Text>
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
              <Text style={[styles.ringNumber, { color: colors.text }]}>{todayMinutes}</Text>
              <Text style={[styles.ringUnit, { color: colors.muted }]}>MINUTES</Text>
            </View>
          </View>
          <Text style={[styles.goalText, { color: colors.text }]}>
            {todayMinutes} / {safeGoal} min
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
  inlineLoader: { paddingVertical: 8 },
  workoutRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  workoutIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: `${COMPLETED}18`, alignItems: "center", justifyContent: "center" },
  workoutIconText: { color: COMPLETED, fontWeight: "900", fontSize: 15 },
  workoutInfo: { flex: 1, gap: 3 },
  workoutName: { fontSize: 13, fontWeight: "700" },
  workoutMeta: { fontSize: 11 },
  completedLabel: { color: COMPLETED, fontSize: 11, fontWeight: "800" },
  emptyText: { fontSize: 12, lineHeight: 18 },
  errorRow: { gap: 8 },
  retryText: { color: ACCENT, fontWeight: "800", fontSize: 12 },
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
