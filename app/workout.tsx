import { useLocalSearchParams, useRouter } from 'expo-router';

import { WorkoutPreviewScreen } from '@/modules/exercise-catalog';

export default function WorkoutRoute() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId?: string }>();
  const router = useRouter();
  return <WorkoutPreviewScreen exerciseId={exerciseId ?? 'bodyweight-squat'} onStart={(id) => router.replace({ pathname: '/session', params: { id } })} />;
}
