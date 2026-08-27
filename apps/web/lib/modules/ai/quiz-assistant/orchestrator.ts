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
    const courseStr = courseCode ? `môn ${courseCode}` : 'môn học này'
    const getLabel = (idx: number) => String.fromCharCode(65 + idx)
    const optionStr = context.targetOptionText || 'phương án này'

    // 🛡️ Scope Guard: Detect unrelated non-academic or foreign-subject queries
    if (userQuery && this.isOutOfScopeQuery(userQuery, context)) {
      return {
        reply: `⚠️ **Câu hỏi ngoài phạm vi ${courseStr}!**\n\nTôi là Trợ lý AI Phòng Thi chuyên hỗ trợ kiến thức ${courseStr} và nội dung bài thi trắc nghiệm. Câu hỏi của bạn không thuộc phạm vi ôn tập của môn học này.\n\n👉 Vui lòng đặt các câu hỏi liên quan đến kiến thức ${courseStr} hoặc bài thi hiện tại!`,
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
      replyText = `💡 **Hướng dẫn phương pháp tư duy 4 bước (${courseStr})**:\n\n1. **Từ khóa then chốt (Keywords)**: Đọc kỹ đề bài để xác định mục tiêu chính và loại tài liệu/quy trình được yêu cầu.\n2. **Nguyên lý cốt lõi (Concept/Rule)**: Liên hệ với các định nghĩa và tiêu chuẩn quy trình của môn học.\n3. **Loại trừ bẫy (Elimination)**: Loại bỏ các phương án có phạm vi quá rộng, chỉ mang tính quy trình chung, hoặc không trực tiếp giải quyết yêu cầu cụ thể của đề bài.\n4. **Tự kiểm tra (Self-Check)**: Đối chiếu từng lựa chọn A, B, C, D với yêu cầu then chốt để tự tin đưa ra quyết định!`
    }
    // 2. Explaining why selected answer is wrong
    else if (intent === 'EXPLAIN_WRONG_ANSWER') {
      if (context.targetOptionText) {
        if (isNegativeQuestion) {
          replyText = `Phân tích phương án bạn đã chọn${optLabel} ("${context.targetOptionText}"):\n\n💡 **Phân tích sư phạm**: Đề bài chứa từ khóa phủ định (**NOT / KHÔNG PHẢI**). Phương án này thực chất là một đặc điểm/nhược điểm có thật, do đó **không thỏa mãn** yêu cầu tìm phương án "không phải" của đề bài.\n\n👉 **Gợi ý**: Hãy đọc kỹ từ khóa phủ định trong đề bài và chọn phương án không thuộc nhóm đặc điểm/nhược điểm này!`
        } else if (!isTargetCorrect) {
          replyText = `Phân tích phương án bạn đã chọn${optLabel} ("${context.targetOptionText}"):\n\n💡 **Phân tích sư phạm**: Phương án này chưa chính xác hoặc không phải là bước ưu tiên theo quy trình chuẩn của môn học.\n\n👉 **Gợi ý**: Hãy đọc lại đề bài và áp dụng phương pháp loại trừ để tìm phương án phù hợp nhất!`
        } else {
          replyText = `Phân tích phương án bạn đã chọn${optLabel} ("${context.targetOptionText}"):\n\n💡 **Phân tích sư phạm**: Phương án này thực tế là phương án đáp ứng đúng định nghĩa và yêu cầu của đề bài.`
        }
      } else {
        replyText = `⚠️ **Bạn chưa chọn phương án nào cho câu hỏi này!**\n\nVui lòng chọn một phương án trước để tôi phân tích chi tiết vì sao lựa chọn đó đúng hay chưa đúng.\n\n💡 **Gợi ý tư duy**: Hãy đọc kỹ các từ khóa then chốt trong đề bài và áp dụng phương pháp loại trừ các phương án hành động vội vàng trước khi đánh giá tác động.`
      }
    }
    // 3. Explaining correct answer
    else if (intent === 'EXPLAIN_CORRECT_ANSWER') {
      if (context.targetOptionText) {
        if (!isTargetCorrect) {
          replyText = `Phân tích phương án${optLabel} ("${context.targetOptionText}"):\n\n⚠️ **Lưu ý**: Phương án${optLabel} **chưa phải là phương án chính xác** cho câu hỏi này.\n\n💡 **Gợi ý tư duy**: Hãy đối chiếu lại định nghĩa chuẩn và tiêu chí đề bài yêu cầu để tìm phương án đúng nhất!`
        } else {
          replyText = `Phân tích phương án bạn đang xem xét${optLabel} ("${context.targetOptionText}"):\n\n💡 **Phân tích chuyên môn**: Phương án này đáp ứng chính xác yêu cầu của đề bài và định nghĩa chuẩn của môn học.`
        }
      } else {
        replyText = `⚠️ **Bạn đang làm bài và chưa chọn đáp án!**\n\nĐể đảm bảo tính trung thực trong phòng thi, AI không tiết lộ trực tiếp đáp án đúng. Dưới đây là hướng dẫn tư duy khái niệm để bạn tự suy luận:\n\n💡 **Gợi ý phương pháp**: Hãy phân tích mục đích và vai trò của từng phương án lựa chọn (A, B, C, D) đối với yêu cầu cụ thể trong đề bài để tìm ra câu trả lời chính xác nhất.\n\n👉 Hãy đối chiếu 4 phương án và chọn câu trả lời bạn cho là chính xác nhất!`
      }
    }
    // 4. Comparing options
    else if (intent === 'COMPARE_OPTIONS') {
      replyText = `Phân tích và so sánh các khái niệm trong câu hỏi:\n\n💡 **Nguyên lý phân biệt**: Hãy phân biệt phạm vi áp dụng, vai trò và thời điểm sử dụng của từng phương án lựa chọn A, B, C, D.\n\n👉 Hãy chú ý điểm khác biệt then chốt giữa các thuật ngữ để đưa ra quyết định chính xác.`
    }
    // 5. Formula inquiries
    else if (intent === 'EXPLAIN_FORMULA') {
      replyText = `Phân tích công thức & phương pháp tính toán:\n\n💡 **Hướng dẫn**: Hãy xác định các tham số đầu vào trong đề bài và áp dụng công thức chuẩn của môn học để tự tính ra kết quả.`
    }
    // 6. Searching for similar questions in Question Bank
    else if (intent === 'FIND_SIMILAR_QUESTION') {
      if (hasSimilar) {
        const topEvidence = evidences[0]
        const qCorrect = Array.isArray(topEvidence.correctAnswer)
          ? topEvidence.correctAnswer.map((i) => getLabel(i)).join(', ')
          : (topEvidence.correctAnswer !== undefined ? getLabel(topEvidence.correctAnswer) : 'N/A')

        const matchedAnswer = topEvidence.matchedAnswerText || optionStr
        replyText = `**CÓ!** Trong dữ liệu đối chiếu ${courseStr}, tìm thấy câu hỏi sau có đáp án đúng là **"${matchedAnswer}"**:\n\n• **Đề bài**: "${topEvidence.content}"\n• **Đáp án đúng trong câu đó**: Phương án ${qCorrect} (${matchedAnswer})`
      } else {
        replyText = `Hiện tại **không tìm thấy câu hỏi tương tự đủ phù hợp** trong dữ liệu đối chiếu ${courseStr} sử dụng **"${optionStr}"** làm đáp án đúng.`
      }
    }
    // 7. General inquiry
    else {
      replyText = `Phân tích câu hỏi ${courseStr}:\n\n💡 **Gợi ý tư duy**: Hãy phân tích kỹ các từ khóa trong đề bài và đối chiếu với 4 phương án lựa chọn A, B, C, D để tự tìm ra đáp án chính xác!`
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
