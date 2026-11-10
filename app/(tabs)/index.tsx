import { useRouter } from 'expo-router';

import { TrainScreen } from '@/modules/exercise-catalog';

export default function TrainRoute() {
  const router = useRouter();
  return <TrainScreen onViewWorkout={(id = 'bodyweight-squat') => router.push({ pathname: '/workout', params: { exerciseId: id } })} onResume={(id) => router.push({ pathname: '/session', params: { id } })} />;
}
