// src/modules/ai-coach/ui/CoachScreen.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography, useReducedMotion } from '@/ui';
import {
  ChatMessage,
  GuidanceRequest,
  GuidanceResponse,
  MAX_CONCERN_LENGTH,
  PreviewScenarioKey,
  UiRequestState,
} from '../model';
import { requestGuidance, resolveCatalogExercise } from '../preview';

export interface CoachScreenProps {
  onOpenExerciseDetail: (exerciseId: string) => void;
}

let idCounter = 1;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now()}_${idCounter}`;
}

export function CoachScreen({ onOpenExerciseDetail }: CoachScreenProps) {
  const reduceMotion = useReducedMotion();
  // Quản lý phiên hội thoại trong RAM
  const [intakeId, setIntakeId] = useState<string>(() => nextId('intake'));
  const [intakeRevision, setIntakeRevision] = useState<number>(0);
  const [conversationModeLabel, setConversationModeLabel] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState<string>('');
  const [requestState, setRequestState] = useState<UiRequestState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failedRequest, setFailedRequest] = useState<GuidanceRequest | null>(null);
  const [showScenarioTools, setShowScenarioTools] = useState<boolean>(false);

  // Refs dùng để chặn stale response / double tap
  const activeIntakeIdRef = useRef<string>(intakeId);
  const activeRevisionRef = useRef<number>(intakeRevision);
  const inFlightRequestIdRef = useRef<string | null>(null);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const isNearBottomRef = useRef<boolean>(true);
  const [hasUnreadBelow, setHasUnreadBelow] = useState<boolean>(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    inFlightRequestIdRef.current = null;
    if (scrollTimerRef.current !== null) clearTimeout(scrollTimerRef.current);
  }, []);

  const scrollToBottom = useCallback((animated = true) => {
    if (scrollTimerRef.current !== null) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: animated && !reduceMotion });
      setHasUnreadBelow(false);
    }, 50);
  }, [reduceMotion]);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const distanceFromBottom =
      contentSize.height - (layoutMeasurement.height + contentOffset.y);
    const nearBottom = distanceFromBottom < 80;
    isNearBottomRef.current = nearBottom;
    if (nearBottom) {
      setHasUnreadBelow(false);
    }
  }, []);

  // Reset phiên hội thoại và vô hiệu hóa mọi request cũ đang chờ
  const performReset = useCallback((newModeLabel: string | null = null) => {
    const freshIntakeId = nextId('intake');
    activeIntakeIdRef.current = freshIntakeId;
    activeRevisionRef.current = 0;
    inFlightRequestIdRef.current = null;
    if (scrollTimerRef.current !== null) clearTimeout(scrollTimerRef.current);
    isNearBottomRef.current = true;

    setIntakeId(freshIntakeId);
    setIntakeRevision(0);
    setConversationModeLabel(newModeLabel);
    setMessages([]);
    setDraft('');
    setRequestState('idle');
    setErrorMessage(null);
    setFailedRequest(null);
    setHasUnreadBelow(false);
  }, []);

  const handlePressNewChat = useCallback(() => {
    const hasContent = messages.length > 0 || draft.trim().length > 0;
    if (!hasContent) {
      performReset(null);
      return;
    }

    Alert.alert(
      'Start a new chat?',
      'This will clear the current preview transcript and draft.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: () => performReset(null),
        },
      ]
    );
  }, [draft, messages.length, performReset]);

  const mapResponseToCoachMessage = useCallback(
    (response: GuidanceResponse): ChatMessage => {
      // Đảm bảo seek_care và review_required không bao giờ hiển thị bài tập
      const allowSuggestions = response.status === 'suggestions_available';
      const resolvedExercises =
        allowSuggestions && response.suggestions
          ? response.suggestions.map((s) => resolveCatalogExercise(s.exerciseId))
          : undefined;

      return {
        id: nextId('msg_coach'),
        role: 'coach',
        senderLabel: 'Coach (Preview)',
        content: response.message,
        source: response.source,
        status: response.status,
        question:
          response.status === 'needs_information' && response.questions?.[0]
            ? response.questions[0]
            : undefined,
        exercises: resolvedExercises,
      };
    },
    []
  );

  const executeGuidanceRequest = useCallback(
    async (
      req: GuidanceRequest,
      options?: { simulatedDelayMs?: number }
    ) => {
      if (inFlightRequestIdRef.current) {
        return; // Chặn double-tap khi đang xử lý cùng lượt
      }

      inFlightRequestIdRef.current = req.requestId;
      setRequestState('submitting');
      setErrorMessage(null);

      const isCurrentRequest = () =>
        req.requestId === inFlightRequestIdRef.current &&
        req.intakeId === activeIntakeIdRef.current &&
        req.intakeRevision === activeRevisionRef.current;

      try {
        if (options?.simulatedDelayMs) {
          await new Promise((res) => setTimeout(res, options.simulatedDelayMs));
        }

        if (!isCurrentRequest()) return;
        const response = await requestGuidance(req);

        // Chặn stale response: Kiểm tra intakeId, revision và requestId
        if (!isCurrentRequest()) return;

        if (response.requestId !== req.requestId ||
            response.intakeId !== req.intakeId ||
            response.intakeRevision !== req.intakeRevision) {
          throw new Error('The reply could not be matched to this conversation. Please retry.');
        }

        const coachMsg = mapResponseToCoachMessage(response);
        setMessages((prev) => [...prev, coachMsg]);
        setRequestState('idle');
        setFailedRequest(null);

        if (isNearBottomRef.current) {
          scrollToBottom();
        } else {
          setHasUnreadBelow(true);
        }
      } catch (err) {
        if (!isCurrentRequest()) return;
        setRequestState('failed');
        setFailedRequest(req);
        setErrorMessage(
          err instanceof Error ? err.message : 'Preview request failed. Please try again.'
        );
      } finally {
        // An older request must never unlock a newer conversation/request.
        if (inFlightRequestIdRef.current === req.requestId) {
          inFlightRequestIdRef.current = null;
        }
      }
    },
    [mapResponseToCoachMessage, scrollToBottom]
  );

  // Gửi tin nhắn nhập tự do
  const handleSendFreeText = useCallback(() => {
    const trimmed = draft.trim();
    if (!trimmed || inFlightRequestIdRef.current || requestState === 'submitting') {
      return;
    }
    if (draft.length > MAX_CONCERN_LENGTH) {
      return;
    }

    const nextRev = activeRevisionRef.current + 1;
    activeRevisionRef.current = nextRev;
    setIntakeRevision(nextRev);

    const userMsg: ChatMessage = {
      id: nextId('msg_user'),
      role: 'user',
      senderLabel: 'You',
      content: trimmed,
      source: 'preview',
    };

    const req: GuidanceRequest = {
      schemaVersion: '1.0',
      requestId: nextId('req'),
      intakeId: activeIntakeIdRef.current,
      intakeRevision: nextRev,
      locale: 'en',
      concern: trimmed,
      answers: {},
      previewScenario: 'free_text',
    };

    setMessages((prev) => [...prev, userMsg]);
    setDraft('');
    scrollToBottom();
    void executeGuidanceRequest(req);
  }, [draft, executeGuidanceRequest, requestState, scrollToBottom]);

  // A. Khởi chạy luồng mẫu "Try sample conversation" ("My leg hurts")
  const handleStartSampleConversation = useCallback(() => {
    const sampleIntakeId = nextId('intake_sample');
    activeIntakeIdRef.current = sampleIntakeId;
    activeRevisionRef.current = 1;
    inFlightRequestIdRef.current = null;

    setIntakeId(sampleIntakeId);
    setIntakeRevision(1);
    setConversationModeLabel('Sample conversation');
    setDraft('');
    setErrorMessage(null);
    setFailedRequest(null);

    const sampleUserMsg: ChatMessage = {
      id: nextId('msg_user'),
      role: 'user',
      senderLabel: 'You',
      content: 'My leg hurts',
      source: 'preview',
    };

    setMessages([sampleUserMsg]);

    const req: GuidanceRequest = {
      schemaVersion: '1.0',
      requestId: nextId('req'),
      intakeId: sampleIntakeId,
      intakeRevision: 1,
      locale: 'en',
      concern: 'My leg hurts',
      answers: {},
      previewScenario: 'sample_followup_step1',
    };

    void executeGuidanceRequest(req);
  }, [executeGuidanceRequest]);

  // Chọn chip câu trả lời trong câu hỏi mẫu
  const handleSelectQuestionOption = useCallback((messageId: string, optionId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId && !m.answerConfirmed
          ? { ...m, selectedOptionId: optionId }
          : m
      )
    );
  }, []);

  // Xác nhận chip câu trả lời -> thêm vào transcript và tăng intakeRevision
  const handleConfirmQuestionAnswer = useCallback(
    (message: ChatMessage) => {
      if (
        !message.question ||
        !message.selectedOptionId ||
        message.answerConfirmed ||
        inFlightRequestIdRef.current ||
        requestState === 'submitting'
      ) {
        return;
      }

      const chosenOption = message.question.options.find(
        (o) => o.id === message.selectedOptionId
      );
      if (!chosenOption) return;

      const nextRev = activeRevisionRef.current + 1;
      activeRevisionRef.current = nextRev;
      setIntakeRevision(nextRev);

      const userAnswerMsg: ChatMessage = {
        id: nextId('msg_user'),
        role: 'user',
        senderLabel: 'You',
        content: chosenOption.label,
        source: 'preview',
      };

      setMessages((prev) =>
        prev
          .map((m) => (m.id === message.id ? { ...m, answerConfirmed: true } : m))
          .concat(userAnswerMsg)
      );

      const req: GuidanceRequest = {
        schemaVersion: '1.0',
        requestId: nextId('req'),
        intakeId: activeIntakeIdRef.current,
        intakeRevision: nextRev,
        locale: 'en',
        concern: 'My leg hurts',
        answers: { [message.question.id]: chosenOption.id },
        previewScenario: 'sample_followup_step2',
      };

      scrollToBottom();
      void executeGuidanceRequest(req);
    },
    [executeGuidanceRequest, requestState, scrollToBottom]
  );

  // B & C. Kích hoạt từng kịch bản cố định (Preview scenarios & Technical errors)
  const handleTriggerScenario = useCallback(
    (scenario: PreviewScenarioKey, label: string) => {
      const scenarioIntakeId = nextId('intake_scenario');
      activeIntakeIdRef.current = scenarioIntakeId;
      activeRevisionRef.current = 1;
      inFlightRequestIdRef.current = null;

      setIntakeId(scenarioIntakeId);
      setIntakeRevision(1);
      setConversationModeLabel(`Preview scenario: ${label}`);
      setMessages([]);
      setDraft('');
      setHasUnreadBelow(false);
      isNearBottomRef.current = true;
      setErrorMessage(null);
      setFailedRequest(null);

      const req: GuidanceRequest = {
        schemaVersion: '1.0',
        requestId: nextId('req'),
        intakeId: scenarioIntakeId,
        intakeRevision: 1,
        locale: 'en',
        concern: `[Scenario Fixture: ${label}]`,
        answers: {},
        previewScenario: scenario,
      };

      void executeGuidanceRequest(req);
    },
    [executeGuidanceRequest]
  );

  // Thử lại khi gặp lỗi kỹ thuật (không nhân đôi user message)
  const handleRetryFailedRequest = useCallback(() => {
    if (!failedRequest || inFlightRequestIdRef.current || requestState === 'submitting') return;

    // Nếu trước đó là kịch bản giả lập lỗi mạng, khi bấm Retry sẽ trả về thành công để kiểm thử recovery
    const retryScenario: PreviewScenarioKey =
      failedRequest.previewScenario === 'error_network' ||
      failedRequest.previewScenario === 'error_wrong_request_id'
        ? 'status_review_required'
        : failedRequest.previewScenario || 'free_text';

    const retryReq: GuidanceRequest = {
      ...failedRequest,
      requestId: nextId('req_retry'),
      previewScenario: retryScenario,
    };

    void executeGuidanceRequest(retryReq);
  }, [executeGuidanceRequest, failedRequest, requestState]);

  // Kiểm thử kết quả đến muộn bị loại bỏ sau khi Reset
  const handleTestStaleLateResponse = useCallback(() => {
    const staleReq: GuidanceRequest = {
      schemaVersion: '1.0',
      requestId: nextId('req_stale'),
      intakeId: activeIntakeIdRef.current,
      intakeRevision: activeRevisionRef.current,
      locale: 'en',
      concern: 'Late response test',
      answers: {},
      previewScenario: 'status_seek_care',
    };

    // Gửi request ngầm với độ trễ 800ms nhưng lập tức reset sang intakeId mới
    void executeGuidanceRequest(staleReq, { simulatedDelayMs: 800 });
    performReset('Fresh chat (Stale response from previous session was ignored)');
  }, [executeGuidanceRequest, performReset]);

  const trimmedDraft = draft.trim();
  const isOverLimit = draft.length > MAX_CONCERN_LENGTH;
  const isSendDisabled =
    trimmedDraft.length === 0 || isOverLimit || requestState === 'submitting';

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View
        style={[
          styles.messageWrapper,
          isUser ? styles.messageWrapperUser : styles.messageWrapperCoach,
        ]}
        accessible={false}
      >
        <Text style={styles.senderLabel}>{item.senderLabel}</Text>

        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.coachBubble,
          ]}
        >
          {/* Nhãn phân biệt loại status cho Coach message (không chỉ dựa vào màu sắc) */}
          {!isUser && item.status === 'seek_care' && (
            <View style={styles.statusTagSeekCare}>
              <Text style={styles.statusTagText}>CARE ROUTING NOTICE (PREVIEW)</Text>
            </View>
          )}
          {!isUser && item.status === 'review_required' && (
            <View style={styles.statusTagNeutral}>
              <Text style={styles.statusTagTextNeutral}>REVIEW / SCOPE NOTICE (PREVIEW)</Text>
            </View>
          )}
          {!isUser && item.status === 'needs_information' && (
            <View style={styles.statusTagNeutral}>
              <Text style={styles.statusTagTextNeutral}>FOLLOW-UP QUESTION (PREVIEW)</Text>
            </View>
          )}
          {!isUser && item.status === 'suggestions_available' && (
            <View style={styles.statusTagNeutral}>
              <Text style={styles.statusTagTextNeutral}>SAMPLE EXERCISE FIXTURE</Text>
            </View>
          )}

          <Text
            selectable
            style={[styles.messageText, isUser ? styles.userText : styles.coachText]}
          >
            {item.content}
          </Text>

          {/* Render câu hỏi + Answer Chips nếu status = needs_information */}
          {item.question && (
            <View style={styles.questionBox}>
              <Text style={styles.questionPrompt}>{item.question.prompt}</Text>
              <View style={styles.chipsRow}>
                {item.question.options.map((option) => {
                  const isSelected = item.selectedOptionId === option.id;
                  return (
                    <Pressable
                      key={option.id}
                      disabled={Boolean(item.answerConfirmed)}
                      onPress={() => handleSelectQuestionOption(item.id, option.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Answer option ${option.label}`}
                      accessibilityState={{
                        selected: isSelected,
                        disabled: Boolean(item.answerConfirmed),
                      }}
                      style={({ pressed }) => [
                        styles.chipButton,
                        pressed && styles.pressed,
                        isSelected && styles.chipButtonSelected,
                        item.answerConfirmed && styles.chipButtonDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {isSelected ? `✓ ${option.label}` : option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {!item.answerConfirmed && (
                <Pressable
                  disabled={!item.selectedOptionId || requestState === 'submitting'}
                  onPress={() => handleConfirmQuestionAnswer(item)}
                  accessibilityRole="button"
                  accessibilityLabel="Confirm selected answer"
                  accessibilityState={{
                    disabled: !item.selectedOptionId || requestState === 'submitting',
                  }}
                  style={[
                    styles.confirmAnswerBtn,
                    (!item.selectedOptionId || requestState === 'submitting') &&
                      styles.buttonDisabled,
                  ]}
                >
                  <Text style={styles.confirmAnswerBtnText}>Confirm answer</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Render Exercise Cards nếu status = suggestions_available */}
          {item.exercises &&
            item.exercises.map((ex) => (
              <View key={ex.exerciseId} style={styles.exerciseCard}>
                <Text style={styles.exerciseDisclaimer}>{ex.disclaimer}</Text>
                <Text style={styles.exerciseTitle}>{ex.title}</Text>
                <Text style={styles.exerciseCategory}>{ex.category}</Text>

                {ex.isAvailable ? (
                  <Pressable
                    onPress={() => onOpenExerciseDetail(ex.exerciseId)}
                    accessibilityRole="button"
                    accessibilityLabel={`View exercise ${ex.title}`}
                    style={({ pressed }) => [styles.viewExerciseBtn, pressed && styles.pressed]}
                  >
                    <Text style={styles.viewExerciseBtnText}>View exercise</Text>
                  </Pressable>
                ) : (
                  <View style={styles.unavailableBadge}>
                    <Text style={styles.unavailableBadgeText}>
                      Exercise unavailable in catalog ({ex.exerciseId})
                    </Text>
                  </View>
                )}
              </View>
            ))}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flexContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 1. Header & Cố định nhãn Preview — not connected */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle} accessibilityRole="header">
              AI Coach
            </Text>
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => setShowScenarioTools((prev) => !prev)}
                accessibilityRole="button"
                accessibilityLabel="Toggle preview scenarios panel"
                accessibilityState={{ expanded: showScenarioTools }}
                style={({ pressed }) => [styles.secondaryHeaderBtn, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryHeaderBtnText}>
                  {showScenarioTools ? 'Hide scenarios' : 'Preview scenarios'}
                </Text>
              </Pressable>

              <Pressable
                onPress={handlePressNewChat}
                accessibilityRole="button"
                accessibilityLabel="Start a new chat"
                style={({ pressed }) => [styles.newChatBtn, pressed && styles.pressed]}
              >
                <Text style={styles.newChatBtnText}>New chat</Text>
              </Pressable>
            </View>
          </View>

          <View
            style={styles.previewBanner}
            accessible
            accessibilityRole="text"
            accessibilityLabel="Preview, not connected. Sample replies only. No data is sent to an AI service."
          >
            <Text style={styles.previewBannerTitle}>Preview — not connected</Text>
            <Text style={styles.previewBannerSubtitle}>
              Sample replies only. No data is sent to an AI service. Chat resets when app closes.
            </Text>
          </View>

          {conversationModeLabel && (
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>
                {conversationModeLabel} · Rev {intakeRevision}
              </Text>
            </View>
          )}
        </View>

        {/* Bảng điều khiển nhanh 4 loại Response & Kịch bản lỗi kỹ thuật cho người review */}
        {showScenarioTools && (
          <View style={styles.scenarioDrawer}>
            <Text style={styles.scenarioSectionTitle}>
              Preview scenarios (Isolated fixtures — not inferred from input)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.scenarioChipsContainer}
            >
              <Pressable
                style={({ pressed }) => [styles.scenarioBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                onPress={() =>
                  handleTriggerScenario('status_needs_information', 'needs_information')
                }
              >
                <Text style={styles.scenarioBtnText}>1. needs_information</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.scenarioBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                onPress={() => handleTriggerScenario('status_seek_care', 'seek_care')}
              >
                <Text style={styles.scenarioBtnText}>2. seek_care</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.scenarioBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                onPress={() =>
                  handleTriggerScenario('status_review_required', 'review_required')
                }
              >
                <Text style={styles.scenarioBtnText}>3. review_required</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.scenarioBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                onPress={() =>
                  handleTriggerScenario(
                    'status_suggestions_available',
                    'suggestions_available'
                  )
                }
              >
                <Text style={styles.scenarioBtnText}>4. suggestions_available</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.scenarioBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                onPress={() =>
                  handleTriggerScenario('invalid_exercise_id', 'Invalid catalog ID')
                }
              >
                <Text style={styles.scenarioBtnText}>Invalid Exercise ID</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.scenarioBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                onPress={() => handleTriggerScenario('error_network', 'Simulated error')}
              >
                <Text style={styles.scenarioBtnText}>Error + Retry</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.scenarioBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                onPress={() =>
                  handleTriggerScenario('error_wrong_request_id', 'Wrong requestId')
                }
              >
                <Text style={styles.scenarioBtnText}>Wrong Request ID</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.scenarioBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                onPress={handleTestStaleLateResponse}
              >
                <Text style={styles.scenarioBtnText}>Late Stale Response</Text>
              </Pressable>
            </ScrollView>
          </View>
        )}

        {/* 2. Vùng Transcript hoặc Empty State */}
        <View style={styles.transcriptArea}>
          {messages.length === 0 ? (
            <ScrollView contentContainerStyle={styles.emptyStateContainer}>
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Explore the AI Coach interface</Text>
                <Text style={styles.emptyBody}>
                  This screen is a UI preview. Entering your own text will return a standard
                  preview notice without analyzing symptoms or storing health data.
                </Text>

                <Pressable
                  onPress={handleStartSampleConversation}
                  accessibilityRole="button"
                  accessibilityLabel="Try sample conversation"
                  style={({ pressed }) => [styles.sampleConversationBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.sampleConversationBtnText}>
                    Try sample conversation
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={renderMessageItem}
              contentContainerStyle={styles.messageListContent}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              keyboardDismissMode="interactive"
            />
          )}

          {hasUnreadBelow && (
            <Pressable
              onPress={() => scrollToBottom(true)}
              accessibilityRole="button"
              accessibilityLabel="Scroll to new message"
              style={({ pressed }) => [styles.newMessageFloatingBtn, pressed && styles.pressed]}
            >
              <Text style={styles.newMessageFloatingText}>↓ New message</Text>
            </Pressable>
          )}
        </View>

        {/* Banner báo lỗi kỹ thuật + nút Retry (không xóa draft, không nhân đôi tin nhắn) */}
        {requestState === 'failed' && errorMessage && (
          <View
            style={styles.errorBanner}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
          >
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
            {failedRequest && (
              <Pressable
                onPress={handleRetryFailedRequest}
                accessibilityRole="button"
                accessibilityLabel="Retry failed request"
                style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}
              >
                <Text style={styles.retryBtnText}>Retry</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* 3. Composer nằm ngoài vùng cuộn */}
        <View style={styles.composerContainer}>
          <View style={styles.composerLabelRow}>
            <Text style={styles.composerLabel}>Your message (Preview mode)</Text>
            <Text
              style={[
                styles.charCount,
                isOverLimit && styles.charCountError,
              ]}
            >
              {draft.length}/{MAX_CONCERN_LENGTH}
            </Text>
          </View>

          {isOverLimit && (
            <Text style={styles.limitErrorText} accessibilityRole="alert">
              Message exceeds the {MAX_CONCERN_LENGTH}-character limit. Please shorten your text.
            </Text>
          )}

          <View style={styles.inputRow}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Describe your concern…"
              placeholderTextColor={colors.textSecondary}
              multiline
              accessibilityLabel="Describe your concern"
              accessibilityHint="Type a message for the AI Coach preview. Press Send button to submit."
              style={styles.textInput}
            />

            <Pressable
              disabled={isSendDisabled}
              onPress={handleSendFreeText}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityState={{ disabled: isSendDisabled }}
              style={({ pressed }) => [styles.sendBtn, isSendDisabled && styles.buttonDisabled, pressed && styles.pressed]}
            >
              <Text style={styles.sendBtnText}>Send</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  flexContainer: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.canvas,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.screenTitle,
    color: colors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  secondaryHeaderBtn: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  secondaryHeaderBtnText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  newChatBtn: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radii.control,
    backgroundColor: colors.accentSurface,
    justifyContent: 'center',
  },
  newChatBtnText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  previewBanner: {
    backgroundColor: colors.accentSurface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.control,
  },
  previewBannerTitle: {
    ...typography.label,
    color: colors.textPrimary,
  },
  previewBannerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  modeBadge: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeBadgeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  scenarioDrawer: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scenarioSectionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  scenarioChipsContainer: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  scenarioBtn: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radii.control,
    backgroundColor: colors.accentSurface,
    justifyContent: 'center',
  },
  scenarioBtnText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  transcriptArea: {
    flex: 1,
  },
  emptyStateContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.gutter,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    padding: spacing.gutter,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  sampleConversationBtn: {
    minHeight: 48,
    backgroundColor: colors.action,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  sampleConversationBtnText: {
    ...typography.bodyStrong,
    color: colors.onAction,
    fontWeight: '700',
  },
  messageListContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  messageWrapper: {
    maxWidth: '88%',
  },
  messageWrapperUser: {
    alignSelf: 'flex-end',
  },
  messageWrapperCoach: {
    alignSelf: 'flex-start',
  },
  senderLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  messageBubble: {
    borderRadius: radii.card,
    padding: spacing.lg,
  },
  userBubble: {
    backgroundColor: colors.action,
  },
  coachBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    ...typography.body,
  },
  userText: {
    color: colors.onAction,
  },
  coachText: {
    color: colors.textPrimary,
  },
  statusTagSeekCare: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSurface,
    borderWidth: 1,
    borderColor: colors.action,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.control,
    marginBottom: spacing.sm,
  },
  statusTagText: {
    ...typography.label,
    color: colors.action,
  },
  statusTagNeutral: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.control,
    marginBottom: spacing.sm,
  },
  statusTagTextNeutral: {
    ...typography.label,
    color: colors.textSecondary,
  },
  questionBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  questionPrompt: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chipButton: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.canvas,
    justifyContent: 'center',
  },
  chipButtonSelected: {
    borderColor: colors.action,
    backgroundColor: colors.accentSurface,
  },
  chipButtonDisabled: {
    opacity: 0.65,
  },
  chipText: {
    ...typography.label,
    color: colors.textPrimary,
  },
  chipTextSelected: {
    color: colors.action,
    fontWeight: '700',
  },
  confirmAnswerBtn: {
    marginTop: spacing.md,
    minHeight: 48,
    backgroundColor: colors.action,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  confirmAnswerBtnText: {
    ...typography.label,
    color: colors.onAction,
    fontWeight: '700',
  },
  exerciseCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.control,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseDisclaimer: {
    ...typography.label,
    color: colors.action,
    marginBottom: spacing.sm,
  },
  exerciseTitle: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  exerciseCategory: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  viewExerciseBtn: {
    minHeight: 48,
    backgroundColor: colors.action,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewExerciseBtnText: {
    ...typography.label,
    color: colors.onAction,
    fontWeight: '700',
  },
  unavailableBadge: {
    padding: spacing.md,
    borderRadius: radii.control,
    backgroundColor: colors.accentSurface,
  },
  unavailableBadgeText: {
    ...typography.label,
    color: colors.textSecondary,
  },
  newMessageFloatingBtn: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.card,
    backgroundColor: colors.textPrimary,
    justifyContent: 'center',
  },
  newMessageFloatingText: {
    ...typography.label,
    color: colors.onAction,
    fontWeight: '700',
  },
  errorBanner: {
    marginHorizontal: 16,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.control,
    backgroundColor: colors.accentSurface,
    borderWidth: 1,
    borderColor: colors.action,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  errorBannerText: {
    ...typography.caption,
    flex: 1,
    color: colors.action,
    fontWeight: '600',
  },
  retryBtn: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.control,
    backgroundColor: colors.action,
    justifyContent: 'center',
  },
  retryBtnText: {
    ...typography.label,
    color: colors.onAction,
    fontWeight: '700',
  },
  composerContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  composerLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  composerLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  charCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  charCountError: {
    color: colors.action,
    fontWeight: '700',
  },
  limitErrorText: {
    ...typography.caption,
    color: colors.action,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  textInput: {
    ...typography.body,
    flex: 1,
    minHeight: 48,
    maxHeight: 110,
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    color: colors.textPrimary,
  },
  sendBtn: {
    minHeight: 48,
    minWidth: 68,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.control,
    backgroundColor: colors.action,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    ...typography.label,
    color: colors.onAction,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
