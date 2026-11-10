// src/modules/ai-coach/index.ts
export { CoachScreen } from './ui/CoachScreen';
export type { CoachScreenProps } from './ui/CoachScreen';
export { requestGuidance, resolveCatalogExercise } from './preview';
export type {
  ChatMessage,
  DataSource,
  GuidanceRequest,
  GuidanceResponse,
  GuidanceResponseStatus,
  UiRequestState,
} from './model';