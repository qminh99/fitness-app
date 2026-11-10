// src/modules/ai-coach/model.ts

export type UiRequestState = 'idle' | 'submitting' | 'failed';

export type GuidanceResponseStatus =
  | 'needs_information'
  | 'seek_care'
  | 'review_required'
  | 'suggestions_available';

export type DataSource = 'preview' | 'server';

export interface IntakeQuestionOption {
  id: string;
  label: string;
}

export interface IntakeQuestion {
  id: string;
  prompt: string;
  options: IntakeQuestionOption[];
}

export interface ExerciseSuggestionDto {
  exerciseId: string;
  note: string;
}

export interface GuidanceRequest {
  schemaVersion: '1.0';
  requestId: string;
  intakeId: string;
  intakeRevision: number;
  locale: 'en';
  concern: string;
  answers: Record<string, string>;
  /** Chỉ dùng cho bước 1 để kích hoạt các kịch bản preview cố định */
  previewScenario?: PreviewScenarioKey;
}

export interface GuidanceResponse {
  schemaVersion: '1.0';
  requestId: string;
  intakeId: string;
  intakeRevision: number;
  source: DataSource;
  status: GuidanceResponseStatus;
  message: string;
  questions?: IntakeQuestion[];
  suggestions?: ExerciseSuggestionDto[];
}

export type PreviewScenarioKey =
  | 'free_text'
  | 'sample_followup_step1'
  | 'sample_followup_step2'
  | 'status_needs_information'
  | 'status_seek_care'
  | 'status_review_required'
  | 'status_suggestions_available'
  | 'invalid_exercise_id'
  | 'error_network'
  | 'error_wrong_request_id';

export interface ResolvedExerciseCard {
  exerciseId: string;
  title: string;
  category: string;
  isAvailable: boolean;
  disclaimer: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'coach';
  senderLabel: 'You' | 'Coach (Preview)';
  content: string;
  source: DataSource;
  status?: GuidanceResponseStatus;
  question?: IntakeQuestion;
  selectedOptionId?: string;
  answerConfirmed?: boolean;
  exercises?: ResolvedExerciseCard[];
}

export const MAX_CONCERN_LENGTH = 2000;
