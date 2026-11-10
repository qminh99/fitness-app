import { Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { SessionScreen } from '@/modules/workout-sessions';

export default function SessionRoute() {
  const { id, from } = useLocalSearchParams<{ id?: string; from?: string }>();
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerBackTitle: from === 'coach' ? 'AI Coach' : 'Train' }} />
      <SessionScreen id={id ?? ''} onProgress={() => router.replace('/progress')} onTrain={() => router.replace('/')} />
    </>
  );
}
