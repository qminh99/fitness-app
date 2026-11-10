import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { WorkoutPreviewScreen } from '@/modules/exercise-catalog';

export default function WorkoutRoute() {
  const { exerciseId, from } = useLocalSearchParams<{ exerciseId?: string; from?: string }>();
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerBackTitle: from === 'coach' ? 'AI Coach' : 'Train' }} />
      <WorkoutPreviewScreen exerciseId={exerciseId ?? 'bodyweight-squat'} onStart={(id) => router.replace({ pathname: '/session', params: from === 'coach' ? { id, from } : { id } })} />
    </>
  );
}
