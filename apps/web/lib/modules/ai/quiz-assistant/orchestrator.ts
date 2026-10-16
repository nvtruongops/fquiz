import { createHash } from 'crypto'
import { container } from '@/lib/core/di'
import type { AIContentService } from '@/lib/modules/ai/services/ai-content.service'
import { QuizContextResolver, type ResolveContextParams } from './context/quiz-context-resolver'
import { IntentResolver } from './intent/intent-resolver'
import { MongoQuestionRetriever } from './retrieval/mongo-question-retriever'
import type { IRetrievalEngine, RetrievalResult } from './retrieval/retrieval-types'
import { PromptEngine } from './prompt/prompt-engine'
import { ConfidenceEngine } from './confidence/confidence-engine'
import { ResponseMapper } from './mapper/response-mapper'
import {
  LLMQuizAssistantOutputSchema,
  type QuizAssistantResponse,
  type LLMQuizAssistantOutput,
  type QuizAIIntent,
} from './schemas/quiz-assistant.schema'
import type { InternalQuizContext } from './context/context-types'
import { QuizAITelemetry } from './telemetry/quiz-ai-telemetry'
import type { StageDurations, SubSourceDurations, LLMTelemetryInfo } from './telemetry/telemetry-types'

export interface OrchestratorOptions {
  retrievalEngine?: IRetrievalEngine
  totalTimeoutMs?: number
  dbRetrievalTimeoutMs?: number
  maxLlmTimeoutMs?: number
}

export class QuizAIOrchestrator {
  private retrievalEngine: IRetrievalEngine
  private totalTimeoutMs: number
  private maxLlmTimeoutMs: number

  constructor(options: OrchestratorOptions = {}) {
    this.retrievalEngine = options.retrievalEngine || new MongoQuestionRetriever(options.dbRetrievalTimeoutMs || 300)
    this.totalTimeoutMs = options.totalTimeoutMs || 2500
    this.maxLlmTimeoutMs = options.maxLlmTimeoutMs || 2200
  }

  /**
   * Execute 8-stage Quiz AI Assistant Pipeline with Deadline Budgeting & Telemetry
   */
  async execute(params: ResolveContextParams): Promise<QuizAssistantResponse> {
    const requestId = QuizAITelemetry.generateRequestId()
    const overallStart = performance.now()
    let stageStart = overallStart

    const durations: StageDurations = {
      contextMs: 0,
      intentMs: 0,
      retrievalMs: 0,
      rankingMs: 0,
      promptMs: 0,
      llmMs: 0,
      validationMs: 0,
      mappingMs: 0,
      totalMs: 0,
    }

    let subSources: SubSourceDurations = {
      questionBankMs: 0,
      quizMs: 0,
      questionBankStatus: 'skipped',
      quizStatus: 'skipped',
      partialFailure: false,
    }

    const llmInfo: LLMTelemetryInfo = {
      provider: 'dynamic-ai',
      model: 'gemini-2.0-flash',
      status: 'success',
      isTimeout: false,
    }

    let context: InternalQuizContext | undefined
    let intent = params.intent || 'GENERAL_INQUIRY'
    let evidences: RetrievalResult[] = []
    let responseMode: 'llm' | 'db_fallback' | 'cached' = 'llm'
    let confidence: 'high' | 'medium' | 'low' = 'low'
    let isSuccess = false
    let errorCode: string | undefined
    let promptText = ''
    let replyText = ''

    let promptTokens = 0
    let completionTokens = 0
    let isActualUsage = false

    try {
      // -------------------------------------------------------------
      // STAGE 1: Context Resolution (Invariant 1: JWT & Invariant 2: question_order)
      // -------------------------------------------------------------
      stageStart = performance.now()
      context = await QuizContextResolver.resolve(params)
      durations.contextMs = Number((performance.now() - stageStart).toFixed(2))

      // -------------------------------------------------------------
      // STAGE 2: Intent Resolution (Explicit or Pattern-matched)
      // -------------------------------------------------------------
      stageStart = performance.now()
      intent = IntentResolver.resolve(params.userQuery, params.intent)
      durations.intentMs = Number((performance.now() - stageStart).toFixed(2))

      // -------------------------------------------------------------
      // STAGE 3 & 4: Parallel Retrieval & Ranking (Promise.allSettled)
      // -------------------------------------------------------------
      stageStart = performance.now()
      if (typeof this.retrievalEngine.searchDetailed === 'function') {
        const detailed = await this.retrievalEngine.searchDetailed({
          courseCode: context.courseCode,
          categoryId: context.categoryId,
          currentQuestionId: context.question.id,
          currentQuestionText: context.question.text,
          targetOptionLetter: context.targetOptionLetter,
          targetOptionText: context.targetOptionText,
          userQuery: params.userQuery,
          intent,
          limit: 2,
        })
        evidences = detailed.evidences
        subSources = detailed.subSources
      } else {
        evidences = await this.retrievalEngine.search({
          courseCode: context.courseCode,
          categoryId: context.categoryId,
          currentQuestionId: context.question.id,
          currentQuestionText: context.question.text,
          targetOptionLetter: context.targetOptionLetter,
          targetOptionText: context.targetOptionText,
          userQuery: params.userQuery,
          intent,
          limit: 2,
        })
      }
      durations.retrievalMs = Number((performance.now() - stageStart).toFixed(2))
      durations.rankingMs = 1.0 // Ranking occurs within retriever
      durations.subSources = subSources

      // -------------------------------------------------------------
      // STAGE 5: 4-Tier Prompt Construction (Invariant 3: Evidence-First)
      // -------------------------------------------------------------
      stageStart = performance.now()
      promptText = PromptEngine.build({
        context,
        intent,
        userQuery: params.userQuery,
        evidences,
      })
      durations.promptMs = Number((performance.now() - stageStart).toFixed(2))

      // Compute canonical cache key
      const canonicalKey = this.computeCanonicalHash(context.courseCode, context.question.id, intent, params.userQuery)

      // -------------------------------------------------------------
      // STAGE 6: LLM Execution with Deadline Management & DB Fallback
      // -------------------------------------------------------------
      const elapsedTime = performance.now() - overallStart
      const remainingBudget = Math.max(500, this.totalTimeoutMs - elapsedTime)
      const llmTimeout = Math.min(this.maxLlmTimeoutMs, remainingBudget)

      let llmOutput: LLMQuizAssistantOutput

      stageStart = performance.now()
      try {
        const aiContentService = container.resolve<AIContentService>('AIContentService')

        const genPromise = aiContentService.generate<LLMQuizAssistantOutput>({
          type: 'quiz_assistant',
          params: {
            questionText: context.question.text.trim(),
            options: context.question.options.map((o) => o.trim()),
            correctAnswer: context.question.correctAnswer,
            submittedAnswer: context.userSubmittedAnswer ?? null,
            explanation: context.question.explanation || null,
            userQuery: (params.userQuery || '').trim().toLowerCase().replace(/\s+/g, ' '),
            courseCode: (context.courseCode || '').trim().toUpperCase(),
            targetOptionLetter: context.targetOptionLetter || null,
            targetOptionText: context.targetOptionText || null,
            similarQuestions: evidences.map((e) => ({
              text: e.content.trim(),
              options: (e.options || []).map((o) => o.trim()),
              correctAnswer: e.correctAnswer ?? 0,
              explanation: e.explanation || null,
            })),
          },
          sourceType: 'SubjectQuestion',
          sourceId: context.courseCode || 'GLOBAL',
        })

        const aiResult: any = await this.withTimeout(genPromise, llmTimeout, 'LLM Generation')
        llmOutput = LLMQuizAssistantOutputSchema.parse(aiResult.content)
        responseMode = aiResult.reused ? 'cached' : 'llm'

        // Capture actual provider token usage if reported
        if (aiResult.usage && typeof aiResult.usage.promptTokens === 'number') {
          promptTokens = aiResult.usage.promptTokens
          completionTokens = aiResult.usage.completionTokens ?? 0
          isActualUsage = true
        }

        if (aiResult.provider) llmInfo.provider = aiResult.provider
        if (aiResult.model) llmInfo.model = aiResult.model
      } catch (genErr: any) {
        const isTimeout = genErr?.message?.includes('Timeout') || false
        llmInfo.isTimeout = isTimeout
        llmInfo.status = isTimeout ? 'timeout' : 'fallback'

        console.warn(
          `[QuizAIOrchestrator] LLM Generation unavailable or timed out (${genErr instanceof Error ? genErr.message : String(genErr)}). Activating Graceful DB Fallback.`
        )
        // Invariant 5: DB Fallback on LLM failure
        llmOutput = this.generateDBFallback(context, evidences, intent, params.userQuery)
        responseMode = 'db_fallback'
      }
      durations.llmMs = Number((performance.now() - stageStart).toFixed(2))
      replyText = llmOutput.reply

      // -------------------------------------------------------------
      // STAGE 7: Deterministic Confidence Evaluation
      // -------------------------------------------------------------
      stageStart = performance.now()
      confidence = ConfidenceEngine.evaluate(evidences, intent)
      durations.validationMs = Number((performance.now() - stageStart).toFixed(2))

      // -------------------------------------------------------------
      // STAGE 8: Response Mapping & DTO Allowlisting (Invariant 4: Anti-Leakage)
      // -------------------------------------------------------------
      stageStart = performance.now()
      const publicResponse = ResponseMapper.toPublicResponse({
        intent,
        llmOutput,
        confidence,
        evidences,
        responseMode,
      })
      durations.mappingMs = Number((performance.now() - stageStart).toFixed(2))
      durations.totalMs = Number((performance.now() - overallStart).toFixed(2))

      isSuccess = true
      return publicResponse
    } catch (err: any) {
      durations.totalMs = Number((performance.now() - overallStart).toFixed(2))
      errorCode = err?.message || 'UNKNOWN_ERROR'
      throw err
    } finally {
      // -------------------------------------------------------------
      // TELEMETRY RECORDING (Prioritize provider usage over heuristic)
      // -------------------------------------------------------------
      const finalPromptTokens = isActualUsage ? promptTokens : QuizAITelemetry.estimateTokens(promptText || params.userQuery)
      const finalCompletionTokens = isActualUsage ? completionTokens : QuizAITelemetry.estimateTokens(replyText)
      const estimatedCostUsd = QuizAITelemetry.calculateEstimatedCost(
        finalPromptTokens,
        finalCompletionTokens,
        llmInfo.model
      )

      QuizAITelemetry.recordEvent({
        requestId,
        timestamp: new Date().toISOString(),
        sessionId: params.sessionId,
        questionId: context?.question?.id || 'unknown',
        userIdHash: QuizAITelemetry.hashUserId(params.authenticatedUserId),
        intent,
        responseMode,
        fallback: responseMode === 'db_fallback',
        confidence,
        evidenceCount: evidences.length,
        tokenUsage: {
          promptTokens: finalPromptTokens,
          completionTokens: finalCompletionTokens,
          totalTokens: finalPromptTokens + finalCompletionTokens,
          isActualUsage,
        },
        estimatedCostUsd,
        durations,
        llmInfo,
        dbMetrics: {
          operationCount: 2,
          retryCount: 0,
        },
        success: isSuccess,
        errorCode,
      })
    }
  }

  /**
   * Deterministic Rule-Based Fallback Generator with Semantic & Intent Precision
   */
  private generateDBFallback(
    context: InternalQuizContext,
    evidences: RetrievalResult[],
    intent: QuizAIIntent,
    userQuery?: string
  ): LLMQuizAssistantOutput {
    const hasSimilar = evidences.length > 0
    const courseCode = context.courseCode || ''
    const courseStr = courseCode ? `course ${courseCode}` : 'this course'
    const getLabel = (idx: number) => String.fromCharCode(65 + idx)
    const optionStr = context.targetOptionText || 'this option'

    // 🛡️ Scope Guard: Detect unrelated non-academic or foreign-subject queries
    if (userQuery && this.isOutOfScopeQuery(userQuery, context)) {
      return {
        reply: `⚠️ **Question out of scope for ${courseStr}!**\n\nI am the Exam AI Assistant specialized in supporting ${courseStr} and quiz content. Your question is outside the scope of this course.\n\n👉 Please ask questions related to ${courseStr} or the current quiz!`,
        formulaExplanation: null,
        similarQuestionFound: false,
        similarQuestionDetails: null,
      }
    }

    const correctIndices = Array.isArray(context.question.correctAnswer)
      ? context.question.correctAnswer
      : [context.question.correctAnswer]

    let isTargetCorrect = false
    if (context.targetOptionIndex !== null && context.targetOptionIndex !== undefined) {
      isTargetCorrect = correctIndices.includes(context.targetOptionIndex)
    } else if (context.targetOptionLetter) {
      const targetIdx = context.targetOptionLetter.toUpperCase().charCodeAt(0) - 65
      isTargetCorrect = correctIndices.includes(targetIdx)
    }

    const optLabel = context.targetOptionLetter ? ` ${context.targetOptionLetter}` : ''
    const isNegativeQuestion = /\b(?:NOT|KHÔNG PHẢI|KHÔNG ĐÚNG|NGOẠI TRỪ|EXCEPT)\b/i.test(context.question.text)

    let replyText = ''

    // 1. Solving mindset & approach (SOLVE_QUESTION)
    if (intent === 'SOLVE_QUESTION') {
      replyText = `💡 **4-Step Thinking Method (${courseStr})**:\n\n1. **Keywords**: Read the question carefully to identify the core objective and required process or concept.\n2. **Core Principle (Concept/Rule)**: Connect with standard subject definitions and guidelines.\n3. **Elimination**: Eliminate options that are overly broad, generic, or do not directly resolve the specific prompt.\n4. **Self-Check**: Compare options A, B, C, D against the key requirements to confidently make your choice!`
    }
    // 2. Explaining why selected answer is wrong
    else if (intent === 'EXPLAIN_WRONG_ANSWER') {
      if (context.targetOptionText) {
        if (isNegativeQuestion) {
          replyText = `Analysis of your selected option${optLabel} ("${context.targetOptionText}"):\n\n💡 **Pedagogical Analysis**: The prompt contains a negative keyword (**NOT / EXCEPT**). This option is actually a valid characteristic/feature, and therefore **does not satisfy** the requirement to find the "not" option.\n\n👉 **Hint**: Re-read the negative condition and select the option outside this group!`
        } else if (!isTargetCorrect) {
          replyText = `Analysis of your selected option${optLabel} ("${context.targetOptionText}"):\n\n💡 **Pedagogical Analysis**: This option is inaccurate or not the prioritized step in standard coursework procedures.\n\n👉 **Hint**: Re-read the prompt and apply process of elimination to find the best option!`
        } else {
          replyText = `Analysis of your selected option${optLabel} ("${context.targetOptionText}"):\n\n💡 **Pedagogical Analysis**: This option actually satisfies the definition and requirements of the question.`
        }
      } else {
        replyText = `⚠️ **You have not selected an option for this question yet!**\n\nPlease select an option first so I can analyze why that choice is correct or incorrect.\n\n💡 **Thinking Hint**: Read the key terms carefully and eliminate hasty actions before evaluating impact.`
      }
    }
    // 3. Explaining correct answer
    else if (intent === 'EXPLAIN_CORRECT_ANSWER') {
      if (context.targetOptionText) {
        if (!isTargetCorrect) {
          replyText = `Analysis of option${optLabel} ("${context.targetOptionText}"):\n\n⚠️ **Note**: Option${optLabel} **is not the correct answer** for this question.\n\n💡 **Thinking Hint**: Compare against standard definitions and criteria to find the correct option!`
        } else {
          replyText = `Analysis of the option you are considering${optLabel} ("${context.targetOptionText}"):\n\n💡 **Professional Analysis**: This option accurately satisfies the question's requirements and subject definitions.`
        }
      } else {
        replyText = `⚠️ **You are currently taking the quiz and have not selected an answer!**\n\nTo ensure academic integrity, AI does not reveal the answer directly. Here is conceptual guidance:\n\n💡 **Method Hint**: Analyze the purpose and role of each option (A, B, C, D) relative to the prompt's requirement.\n\n👉 Compare the 4 options and select the answer you believe is correct!`
      }
    }
    // 4. Comparing options
    else if (intent === 'COMPARE_OPTIONS') {
      replyText = `Analysis and comparison of concepts in the question:\n\n💡 **Distinguishing Principle**: Differentiate the scope, purpose, and usage timing of options A, B, C, and D.\n\n👉 Pay attention to key differences between terms to make an accurate choice.`
    }
    // 5. Formula inquiries
    else if (intent === 'EXPLAIN_FORMULA') {
      replyText = `Analysis of formula & calculation method:\n\n💡 **Guidance**: Identify the input parameters in the prompt and apply the standard subject formula to compute the result.`
    }
    // 6. Searching for similar questions in Question Bank
    else if (intent === 'FIND_SIMILAR_QUESTION') {
      if (hasSimilar) {
        const topEvidence = evidences[0]
        const qCorrect = Array.isArray(topEvidence.correctAnswer)
          ? topEvidence.correctAnswer.map((i) => getLabel(i)).join(', ')
          : (topEvidence.correctAnswer !== undefined ? getLabel(topEvidence.correctAnswer) : 'N/A')

        const matchedAnswer = topEvidence.matchedAnswerText || optionStr
        replyText = `**YES!** In reference data ${courseStr}, found the following question with correct answer **"${matchedAnswer}"**:\n\n• **Question**: "${topEvidence.content}"\n• **Correct answer in that question**: Option ${qCorrect} (${matchedAnswer})`
      } else {
        replyText = `Currently **no matching similar question found** in reference data ${courseStr} using **"${optionStr}"** as the correct answer.`
      }
    }
    // 7. General inquiry
    else {
      replyText = `Analysis of question ${courseStr}:\n\n💡 **Thinking Hint**: Carefully analyze keywords in the prompt and compare against options A, B, C, and D to identify the correct answer!`
    }

    return {
      reply: replyText,
      formulaExplanation: null,
      similarQuestionFound: hasSimilar && intent === 'FIND_SIMILAR_QUESTION',
      similarQuestionDetails: (hasSimilar && intent === 'FIND_SIMILAR_QUESTION') ? evidences[0].content : null,
    }
  }

  private computeCanonicalHash(courseCode: string, questionId: string, intent: string, query: string): string {
    const canonical = [
      (courseCode || '').trim().toUpperCase(),
      (questionId || '').trim(),
      (intent || '').trim().toUpperCase(),
      (query || '').trim().toLowerCase().replace(/\s+/g, ' '),
    ].join('::')
    return createHash('sha256').update(canonical).digest('hex')
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`[QuizAIOrchestrator] Timeout ${ms}ms exceeded during ${label}`))
      }, ms)

      promise
        .then((res) => {
          clearTimeout(timer)
          resolve(res)
        })
        .catch((err) => {
          clearTimeout(timer)
          reject(err)
        })
    })
  }

  private isOutOfScopeQuery(userQuery: string, context: InternalQuizContext): boolean {
    const query = (userQuery || '').trim().toLowerCase()
    if (!query) return false

    // 1. Explicit domain out-of-scope patterns (general chatter, non-academic topics)
    const outOfScopePatterns = [
      /\b(?:car|cars|hybrid|toyota|honda|tesla|vehicle|automobile|xe hơi|ô tô|xe máy|xe cộ)\b/i,
      /\b(?:weather|thời tiết|nhiệt độ|trời mưa|trời nắng|dự báo thời tiết)\b/i,
      /\b(?:cook|cooking|recipe|nấu ăn|món ăn|cơm|bánh|thực đơn|quán ăn|nhà hàng)\b/i,
      /\b(?:movie|film|cinema|phim|diễn viên|hollywood|netflix)\b/i,
      /\b(?:football|soccer|bóng đá|ngoại hạng anh|world cup|cầu thủ|messi|ronaldo)\b/i,
      /\b(?:music|song|ca sĩ|bài hát|nhạc sĩ|kpop|vpop|album)\b/i,
      /\b(?:crypto|bitcoin|ethereum|tiền ảo|chứng khoán|cổ phiếu|forex)\b/i,
      /\b(?:love|tình yêu|hẹn hò|crush|người yêu|bạn gái|bạn trai)\b/i,
      /\b(?:game|gaming|chơi game|liên quân|lien minh|free fire|pubg)\b/i,
      /\b(?:travel|du lịch|khách sạn|vé máy bay|địa điểm du lịch)\b/i,
    ]

    if (outOfScopePatterns.some((p) => p.test(query))) {
      return true
    }

    // 2. Token overlap heuristic for multi-word non-quiz questions
    const quizWords = new Set<string>([
      (context.courseCode || '').toLowerCase(),
      'câu', 'hỏi', 'đáp', 'án', 'tại', 'sao', 'vì', 'sao', 'lý', 'do', 'giải', 'thích',
      'chọn', 'phương', 'án', 'đúng', 'sai', 'công', 'thức', 'tính', 'so', 'sánh',
      'true', 'false', 'why', 'what', 'which', 'how', 'explain', 'solve', 'answer', 'option',
      'question', 'quiz', 'hint', 'help', 'gợi', 'ý', 'tư', 'duy',
      ...context.question.text.toLowerCase().split(/\W+/),
      ...context.question.options.flatMap((o) => o.toLowerCase().split(/\W+/)),
    ].filter((w) => w && w.length >= 2))

    const queryWords = query.split(/\W+/).filter((w) => w && w.length >= 3)
    if (queryWords.length >= 4) {
      const hasOverlap = queryWords.some((qw) => quizWords.has(qw))
      if (!hasOverlap) {
        return true
      }
    }

    return false
  }
}
