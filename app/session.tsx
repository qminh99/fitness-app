import { useLocalSearchParams, useRouter } from 'expo-router';

import { SessionScreen } from '@/modules/workout-sessions';

export default function SessionRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  return <SessionScreen id={id ?? ''} onProgress={() => router.replace('/progress')} onTrain={() => router.replace('/')} />;
}
