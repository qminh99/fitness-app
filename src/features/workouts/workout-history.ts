import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@fitness-app/workout-history-v1";

export type CompletedWorkout = {
  id: string;
  workoutName: string;
  startedAt: string;
  completedAt: string;
  durationMinutes: number;
  status: "completed";
};

export type NewCompletedWorkout = Omit<CompletedWorkout, "id" | "status"> & {
  id?: string;
};

function isValidDateString(value: string): boolean {
  return Number.isFinite(new Date(value).getTime());
}

function isCompletedWorkout(value: unknown): value is CompletedWorkout {
  if (!value || typeof value !== "object") return false;

  const workout = value as Record<string, unknown>;
  return (
    typeof workout.id === "string" &&
    typeof workout.workoutName === "string" &&
    typeof workout.startedAt === "string" &&
    isValidDateString(workout.startedAt) &&
    typeof workout.completedAt === "string" &&
    isValidDateString(workout.completedAt) &&
    typeof workout.durationMinutes === "number" &&
    Number.isFinite(workout.durationMinutes) &&
    workout.durationMinutes >= 0 &&
    workout.status === "completed"
  );
}

/** Return the local calendar date as YYYY-MM-DD (not a UTC date). */
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Read all completed workout sessions saved on this device. */
export async function getWorkoutHistory(): Promise<CompletedWorkout[]> {
  const rawValue = await AsyncStorage.getItem(STORAGE_KEY);
  if (!rawValue) return [];

  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(isCompletedWorkout)
      .sort(
        (a, b) =>
          new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
      );
  } catch {
    // A malformed local record should not prevent Home from opening.
    return [];
  }
}

/** Save a session only after the user has actually completed the workout. */
export async function saveCompletedWorkout(
  input: NewCompletedWorkout,
): Promise<CompletedWorkout> {
  const workoutName = input.workoutName.trim();

  if (!workoutName) {
    throw new Error("Workout name is required.");
  }
  if (!isValidDateString(input.startedAt) || !isValidDateString(input.completedAt)) {
    throw new Error("Workout start and completion times must be valid dates.");
  }
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes < 0) {
    throw new Error("Workout duration must be a non-negative number.");
  }

  const record: CompletedWorkout = {
    id: input.id ?? `workout-${Date.now()}`,
    workoutName,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    durationMinutes: Math.round(input.durationMinutes),
    status: "completed",
  };

  const history = await getWorkoutHistory();
  const updatedHistory = [
    ...history.filter((item) => item.id !== record.id),
    record,
  ].sort(
    (a, b) =>
      new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
  );

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  return record;
}

/** Return completed sessions whose completion date matches the selected local day. */
export function getWorkoutsForDate(
  history: CompletedWorkout[],
  date: Date,
): CompletedWorkout[] {
  const selectedKey = toLocalDateKey(date);
  return history.filter(
    (workout) => toLocalDateKey(new Date(workout.completedAt)) === selectedKey,
  );
}

/** Sum completed workout minutes for the selected local day. */
export function getWorkoutMinutesForDate(
  history: CompletedWorkout[],
  date: Date,
): number {
  return getWorkoutsForDate(history, date).reduce(
    (total, workout) => total + workout.durationMinutes,
    0,
  );
}
