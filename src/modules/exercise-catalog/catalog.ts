
export type Exercise = {
  id: string;
  name: string;
  group: 'Strength' | 'Mobility' | 'Cardio';
  focus: string;
  reps: string;
  sets: number;
  rest: number;
  minutes: number;
  icon: 'barbell-outline' | 'body-outline' | 'walk-outline';
  instructions: string[];
};

export const exercises: Exercise[] = [
  // ==========================================
  // STRENGTH - 4 EXERCISES
  // ==========================================

  {
    id: 'bodyweight-squat',
    name: 'Bodyweight Squat',
    group: 'Strength',
    focus: 'Legs · Glutes',
    reps: '10 reps',
    sets: 2,
    rest: 30,
    minutes: 5,
    icon: 'barbell-outline',
    instructions: [
      'Stand with feet about shoulder-width apart.',
      'Bend your knees and hips into a comfortable squat.',
      'Press through your feet to stand. Keep the movement controlled.',
    ],
  },

  {
    id: 'wall-push-up',
    name: 'Wall Push-up',
    group: 'Strength',
    focus: 'Chest · Arms',
    reps: '8 reps',
    sets: 2,
    rest: 30,
    minutes: 4,
    icon: 'barbell-outline',
    instructions: [
      'Face a wall, hands at shoulder height.',
      'Bend your elbows and bring your chest toward the wall.',
      'Push back slowly, keeping your body in a straight line.',
    ],
  },

  {
    id: 'glute-bridge',
    name: 'Glute Bridge',
    group: 'Strength',
    focus: 'Glutes · Core',
    reps: '10 reps',
    sets: 2,
    rest: 30,
    minutes: 5,
    icon: 'barbell-outline',
    instructions: [
      'Lie on your back, knees bent and feet flat.',
      'Lift your hips gently while keeping your ribs relaxed.',
      'Lower slowly. Avoid arching your lower back.',
    ],
  },

  {
    id: 'calf-raise',
    name: 'Calf Raise',
    group: 'Strength',
    focus: 'Calves · Balance',
    reps: '12 reps',
    sets: 2,
    rest: 20,
    minutes: 3,
    icon: 'body-outline',
    instructions: [
      'Stand beside a wall or stable chair.',
      'Rise onto the balls of your feet.',
      'Lower your heels slowly and keep a light hold for balance.',
    ],
  },

  // ==========================================
  // MOBILITY - 4 EXERCISES
  // ==========================================

  {
    id: 'shoulder-roll',
    name: 'Shoulder Rolls',
    group: 'Mobility',
    focus: 'Shoulders · Upper Back',
    reps: '8 gentle circles',
    sets: 2,
    rest: 20,
    minutes: 3,
    icon: 'body-outline',
    instructions: [
      'Sit or stand comfortably with arms relaxed.',
      'Make small, comfortable circles with your shoulders.',
      'Stay in a pain-free range.',
    ],
  },

  {
    id: 'ankle-circle',
    name: 'Ankle Circles',
    group: 'Mobility',
    focus: 'Ankles',
    reps: '8 each direction',
    sets: 2,
    rest: 15,
    minutes: 3,
    icon: 'body-outline',
    instructions: [
      'Sit on a stable chair.',
      'Lift one foot slightly and make small ankle circles.',
      'Change direction, then switch feet.',
    ],
  },

  {
    id: 'wall-slide',
    name: 'Wall Slides',
    group: 'Mobility',
    focus: 'Shoulders · Upper Back',
    reps: '8 reps',
    sets: 2,
    rest: 20,
    minutes: 4,
    icon: 'body-outline',
    instructions: [
      'Stand comfortably with your back near a wall.',
      'Slide your arms upward only as far as comfortable.',
      'Lower slowly. Do not force your shoulders or neck.',
    ],
  },

  {
    id: 'bird-dog',
    name: 'Bird Dog',
    group: 'Mobility',
    focus: 'Core · Balance & Stability',
    reps: '6 each side',
    sets: 2,
    rest: 30,
    minutes: 5,
    icon: 'body-outline',
    instructions: [
      'Start on hands and knees on a comfortable surface.',
      'Reach one arm and the opposite leg out slowly.',
      'Return, switch sides and keep your torso still.',
    ],
  },

  // ==========================================
  // CARDIO - 4 EXERCISES
  // ==========================================

  {
    id: 'standing-march',
    name: 'Standing March',
    group: 'Cardio',
    focus: 'Full Body',
    reps: '30 seconds',
    sets: 2,
    rest: 20,
    minutes: 3,
    icon: 'walk-outline',
    instructions: [
      'Stand tall near a stable support if needed.',
      'Alternate lifting each knee to a comfortable height.',
      'Move at an easy pace and breathe normally.',
    ],
  },

  {
    id: 'side-step',
    name: 'Side Steps',
    group: 'Cardio',
    focus: 'Legs · Coordination',
    reps: '30 seconds',
    sets: 2,
    rest: 20,
    minutes: 3,
    icon: 'walk-outline',
    instructions: [
      'Clear some space and stand comfortably.',
      'Step to one side and bring the other foot toward it.',
      'Alternate directions at an easy pace.',
    ],
  },

  {
    id: 'step-touch',
    name: 'Step Touch',
    group: 'Cardio',
    focus: 'Full Body · Coordination',
    reps: '30 seconds',
    sets: 2,
    rest: 20,
    minutes: 3,
    icon: 'walk-outline',
    instructions: [
      'Stand comfortably with feet about hip-width apart.',
      'Step to the right and bring your left foot toward it.',
      'Repeat to the left at a comfortable rhythm.',
    ],
  },

  {
    id: 'alternating-toe-taps',
    name: 'Alternating Toe Taps',
    group: 'Cardio',
    focus: 'Legs · Coordination',
    reps: '30 seconds',
    sets: 2,
    rest: 20,
    minutes: 3,
    icon: 'walk-outline',
    instructions: [
      'Stand comfortably with your feet hip-width apart.',
      'Tap your right toe forward, then return to the starting position.',
      'Repeat with your left foot and alternate at a comfortable pace.',
    ],
  },
];

// ==========================================
// HELPER FUNCTION
// ==========================================

export function getExercise(id: string) {
  return exercises.find((exercise) => exercise.id === id);
}

