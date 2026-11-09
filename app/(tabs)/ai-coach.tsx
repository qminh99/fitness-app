// app/(tabs)/ai-coach.tsx
import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { CoachScreen, resolveCatalogExercise } from '@/modules/ai-coach';

export default function AiCoachRoute() {
  const router = useRouter();

  const handleOpenExerciseDetail = useCallback(
    (exerciseId: string) => {
      const resolved = resolveCatalogExercise(exerciseId);
      if (!resolved.isAvailable) {
        return; // Không mở bài mặc định nếu ID không hợp lệ
      }

      router.push({
        pathname: '/workout',
        params: { exerciseId: resolved.exerciseId },
      });
    },
    [router]
  );

  return <CoachScreen onOpenExerciseDetail={handleOpenExerciseDetail} />;
}