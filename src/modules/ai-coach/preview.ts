import { getExercise } from '@/modules/exercise-catalog';

import {
  GuidanceRequest,
  GuidanceResponse,
  IntakeQuestion,
  ResolvedExerciseCard,
} from './model';

export function resolveCatalogExercise(exerciseId: string): ResolvedExerciseCard {
  const found = getExercise(exerciseId);

  if (!found) {
    return {
      exerciseId,
      title: 'Unavailable exercise',
      category: 'Not found in catalog',
      isAvailable: false,
      disclaimer: 'Sample exercise — not a recommendation for your symptoms',
    };
  }

  return {
    exerciseId,
    title: found.name,
    category: found.group,
    isAvailable: true,
    disclaimer: 'Sample exercise — not a recommendation for your symptoms',
  };
}

export const SAMPLE_LEG_LOCATION_QUESTION: IntakeQuestion = {
  id: 'q_leg_location',
  prompt: 'Where in your leg do you notice the discomfort most? (Sample layout fixture)',
  options: [
    { id: 'knee', label: 'Knee' },
    { id: 'ankle', label: 'Ankle' },
    { id: 'calf', label: 'Calf' },
    { id: 'not_sure', label: 'Not sure' },
  ],
};

/**
 * Điểm nối API duy nhất cho màn hình Coach.
 * Ở Bước 2 (MedGemma), chỉ cần thay phần thân hàm này bằng HTTP adapter.
 */
export async function requestGuidance(
  request: GuidanceRequest,
  signal?: AbortSignal
): Promise<GuidanceResponse> {
  if (signal?.aborted) {
    throw new Error('Request aborted');
  }

  const base: Omit<GuidanceResponse, 'status' | 'message'> = {
    schemaVersion: '1.0',
    requestId: request.requestId,
    intakeId: request.intakeId,
    intakeRevision: request.intakeRevision,
    source: 'preview',
  };

  switch (request.previewScenario) {
    case 'error_network':
      throw new Error(
        'Preview technical error: Simulated request failure. Your draft is preserved—tap Retry to test recovery.'
      );

    case 'error_wrong_request_id':
      return {
        ...base,
        requestId: 'mismatched_req_id_999',
        status: 'review_required',
        message: 'This message has a mismatched requestId and must be ignored by the UI.',
      };

    case 'sample_followup_step1':
    case 'status_needs_information':
      return {
        ...base,
        status: 'needs_information',
        message:
          'Sample follow-up question to demonstrate structured intake chips. No clinical evaluation is performed.',
        questions: [SAMPLE_LEG_LOCATION_QUESTION],
      };

    case 'sample_followup_step2':
      return {
        ...base,
        status: 'review_required',
        message:
          'Preview intake step recorded. A connected backend and approved clinical protocol are required to continue from here. No exercises are suggested for pain symptoms in preview mode.',
      };

    case 'status_seek_care':
      return {
        ...base,
        status: 'seek_care',
        message:
          'Sample care-routing message — approved guidance will appear here after integration.',
      };

    case 'status_review_required':
      return {
        ...base,
        status: 'review_required',
        message:
          'Out of scope / Review required (Sample): This concern requires clinical review or falls outside automated coaching scope. No exercise suggestions are shown.',
      };

    case 'status_suggestions_available':
      return {
        ...base,
        status: 'suggestions_available',
        message:
          'Sample exercise card fixture to verify layout and catalog resolution. Separate from any symptom conversation.',
        suggestions: [
          {
            exerciseId: 'bodyweight-squat',
            note: 'Sample exercise — not a recommendation for your symptoms',
          },
        ],
      };

    case 'invalid_exercise_id':
      return {
        ...base,
        status: 'suggestions_available',
        message:
          'Testing catalog boundary with an invalid exercise ID. The card should display as unavailable and block navigation.',
        suggestions: [
          {
            exerciseId: 'non-existent-exercise-999',
            note: 'Sample exercise — not a recommendation for your symptoms',
          },
        ],
      };

    case 'free_text':
    default:
      return {
        ...base,
        status: 'review_required',
        message:
          'Preview only. AI responses are not connected yet. Use the sample conversation to explore the interface.',
      };
  }
}
