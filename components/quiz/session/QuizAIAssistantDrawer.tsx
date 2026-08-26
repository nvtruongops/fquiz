'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Bot, Send, Loader2, Layers, CheckCircle2, ChevronDown, BookOpen, Sparkles, ShieldCheck, HelpCircle, Zap, Database, Check, ThumbsUp, ThumbsDown } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { useAuth } from '@/hooks/auth/useAuth'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import type { QuizAIIntent } from '@/lib/modules/ai/quiz-assistant/schemas/quiz-assistant.schema'

interface QuizAIAssistantDrawerProps {
  sessionId: string
  currentQuestionIndex: number
  currentQuestion?: {
    _id?: string
    text?: string
    options?: string[]
    correct_answer?: number | number[]
    explanation?: string
  }
}

interface EvidenceCitation {
  sourceId: string
  sourceType: 'question_bank' | 'quiz' | 'course_document'
  snippet: string
  relevance: number
  matchedAnswerText?: string
  breakdown?: {
    optionScore: number
    questionScore: number
    subjectScore: number
  }
}

interface ChatMessage {
  id: string
  requestId?: string
  sender: 'user' | 'assistant'
  text: string
  intent?: QuizAIIntent
  confidence?: 'high' | 'medium' | 'low'
  responseMode?: 'llm' | 'db_fallback' | 'cached'
  fallback?: boolean
  evidenceUsed?: EvidenceCitation[]
  formulaExplanation?: string | null
  similarQuestionFound?: boolean
  similarQuestionDetails?: string | null
  feedback?: boolean | null
  timestamp: Date
}

function FormattedMessageText({ text }: { text: string }) {
  if (!text) return null

  const lines = text.split('\n')

  return (
    <div className="space-y-1.5 leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) {
          return <div key={`empty-${idx}`} className="h-1" />
        }

        const isBullet = trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ')
        const cleanLine = isBullet ? trimmed.replace(/^[•\-\*]\s*/, '') : trimmed

        // Parse inline bold **text**, *italic*, `code`
        const parts = cleanLine.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)

        const formattedContent = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            return (
              <strong key={`b-${pIdx}`} className="font-bold text-foreground">
                {part.slice(2, -2)}
              </strong>
            )
          }
          if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
            return (
              <em key={`i-${pIdx}`} className="italic text-muted-foreground">
                {part.slice(1, -1)}
              </em>
            )
          }
          if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
            return (
              <code key={`c-${pIdx}`} className="px-1 py-0.5 rounded bg-card border border-border text-primary text-[10px] font-mono">
                {part.slice(1, -1)}
              </code>
            )
          }
          return <span key={`s-${pIdx}`}>{part}</span>
        })

        if (isBullet) {
          return (
            <div key={`line-${idx}`} className="flex items-start gap-1.5 pl-0.5">
              <span className="text-primary font-bold select-none text-xs leading-normal">•</span>
              <div className="flex-1">{formattedContent}</div>
            </div>
          )
        }

        return <p key={`line-${idx}`}>{formattedContent}</p>
      })}
    </div>
  )
}

export function QuizAIAssistantDrawer({ sessionId, currentQuestionIndex, currentQuestion }: QuizAIAssistantDrawerProps) {
  const { data: authData } = useAuth()
  const isDev = authData?.user?.role === 'dev'

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Click-outside listener to minimize popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.removeEventListener('mousedown', handleClickOutside)
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome-msg',
          sender: 'assistant',
          text: 'Xin chào! Tôi là Trợ lý AI Phòng Thi. Tôi có thể giúp bạn phân tích lý do chọn đáp án, công thức tính toán hoặc đối chiếu câu hỏi tương tự trong ngân hàng đề.',
          confidence: 'high',
          responseMode: 'llm',
          timestamp: new Date(),
        },
      ])
    }
  }, [isOpen, messages.length])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (!isDev) return null

  const handleSend = async (customQuery?: string, explicitIntent?: QuizAIIntent) => {
    const textToSend = (customQuery || query).trim()
    if (!textToSend || isLoading) return

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      intent: explicitIntent,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!customQuery) setQuery('')
    setIsLoading(true)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/v1/ai/quiz-assistant`, {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          sessionId,
          questionIndex: currentQuestionIndex,
          questionText: currentQuestion?.text,
          options: currentQuestion?.options,
          correctAnswer: currentQuestion?.correct_answer,
          explanation: currentQuestion?.explanation,
          userQuery: textToSend,
          intent: explicitIntent,
        }),
      })

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(errJson.error || 'Không thể kết nối dịch vụ AI Assistant')
      }

      const resData = await res.json()
      const data = resData.data || {}

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'Đã phân tích xong câu hỏi.',
        intent: data.intent || explicitIntent,
        confidence: data.confidence || 'medium',
        responseMode: data.responseMode || (data.fallback ? 'db_fallback' : 'llm'),
        fallback: data.fallback ?? false,
        evidenceUsed: data.evidenceUsed || [],
        formulaExplanation: data.formulaExplanation,
        similarQuestionFound: data.similarQuestionFound,
        similarQuestionDetails: data.similarQuestionDetails,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, botMsg])
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: err instanceof Error ? err.message : 'Có lỗi xảy ra khi xử lý yêu cầu.',
        confidence: 'low',
        responseMode: 'db_fallback',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFeedback = async (msg: ChatMessage, helpful: boolean) => {
    // 1. Optimistic local update
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, feedback: helpful } : m))
    )

    // 2. Fire non-blocking telemetry POST
    try {
      await fetch('/api/v1/ai/quiz-assistant/feedback', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          sessionId,
          questionIndex: currentQuestionIndex,
          requestId: msg.requestId,
          intent: msg.intent,
          responseMode: msg.responseMode,
          confidence: msg.confidence,
          helpful,
        }),
      })
    } catch {
      // Non-blocking telemetry
    }
  }

  return (
    <div ref={popoverRef} className="fixed bottom-20 right-6 z-50">
      {/* Floating Push-Up Chat Card Box */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[calc(100vw-32px)] sm:w-[430px] h-[540px] max-h-[78vh] bg-card text-card-foreground border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="p-3.5 border-b border-border flex items-center justify-between bg-muted/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-foreground flex items-center gap-1.5">
                  Trợ Lý AI Phòng Thi
                  <span className="px-1.5 py-0.5 rounded-md bg-warning-bg text-warning-fg text-[9px] font-extrabold border border-warning-border uppercase tracking-tight">
                    DEV ONLY
                  </span>
                </h3>
                <p className="text-[10px] text-muted-foreground font-medium">Đối chiếu ngân hàng đề & Giải thích sư phạm</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 quiz-scroll">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl p-3 text-xs font-medium leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-xs shadow-xs font-semibold'
                      : 'bg-muted/80 border border-border text-foreground rounded-bl-xs shadow-xs space-y-2'
                  }`}
                >
                  <FormattedMessageText text={msg.text} />

                  {/* Formula Breakdown Section */}
                  {msg.formulaExplanation && (
                    <div className="p-2.5 rounded-xl bg-card border border-border text-foreground text-[11px] font-sans space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-primary">
                        <Layers className="w-3.5 h-3.5 text-primary" />
                        <span>Phân tích công thức & Các bước tính:</span>
                      </div>
                      <p className="text-muted-foreground whitespace-pre-wrap">{msg.formulaExplanation}</p>
                    </div>
                  )}

                  {/* Similar Question Found Alert */}
                  {msg.similarQuestionFound && (
                    <div className="p-2.5 rounded-xl bg-info-bg border border-info-border text-info-fg text-[11px] space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-info-fg" />
                        <span>Tìm thấy câu tương tự trong Ngân hàng đề:</span>
                      </div>
                      {msg.similarQuestionDetails && (
                        <p className="text-info-fg/90 whitespace-pre-wrap">{msg.similarQuestionDetails}</p>
                      )}
                    </div>
                  )}

                  {/* Evidence Citations Section (Deepest Display with Answer & Breakdown) */}
                  {msg.evidenceUsed && msg.evidenceUsed.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-card border border-border text-foreground text-[10px] space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-muted-foreground">
                        <BookOpen className="w-3 h-3 text-primary" />
                        <span>Bằng chứng đối chiếu ({msg.evidenceUsed.length} câu phù hợp):</span>
                      </div>
                      <div className="space-y-2">
                        {msg.evidenceUsed.map((ev, idx) => (
                          <div key={idx} className="p-2 rounded-xl bg-muted/50 border border-border/70 text-muted-foreground space-y-1.5">
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-primary font-bold">
                                {ev.sourceType === 'question_bank' ? '🏷️ Ngân hàng đề' : '🏷️ Đề thi môn học'}
                              </span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-card border border-border font-bold text-foreground">
                                Độ khớp: {Math.round(ev.relevance * 100)}%
                              </span>
                            </div>

                            <p className="text-foreground/90 font-medium leading-tight">{`"${ev.snippet}"`}</p>

                            {/* Transparent Matched Answer */}
                            {ev.matchedAnswerText && (
                              <div className="flex items-center gap-1 text-[10px] text-success-fg font-semibold bg-success-bg/80 border border-success-border/60 px-2 py-0.5 rounded-lg">
                                <Check className="w-3 h-3 shrink-0" />
                                <span>Đáp án đúng trong câu này: <strong>{ev.matchedAnswerText}</strong></span>
                              </div>
                            )}

                            {/* Transparent Scoring Breakdown */}
                            {ev.breakdown && (
                              <div className="pt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-muted-foreground font-mono">
                                <span>🎯 Khớp đáp án: <strong>{Math.round(ev.breakdown.optionScore * 100)}%</strong></span>
                                <span>📝 Ngữ cảnh: <strong>{Math.round(ev.breakdown.questionScore * 100)}%</strong></span>
                                <span>📚 Môn: <strong>{Math.round(ev.breakdown.subjectScore * 100)}%</strong></span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confidence & Mode Indicator Footer */}
                  {msg.sender === 'assistant' && msg.id !== 'welcome-msg' && (
                    <div className="pt-1 flex flex-wrap items-center gap-1.5 text-[9px]">
                      {/* Independent Response Source Badge */}
                      {msg.responseMode === 'cached' && (
                        <span className="inline-flex items-center gap-1 font-bold text-info-fg bg-info-bg border border-info-border px-2 py-0.5 rounded-full">
                          <Zap className="w-2.5 h-2.5" />
                          Nguồn: Cache
                        </span>
                      )}
                      {msg.responseMode === 'db_fallback' && (
                        <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
                          <Database className="w-2.5 h-2.5" />
                          Nguồn: Đối chiếu dự phòng
                        </span>
                      )}
                      {msg.responseMode === 'llm' && (
                        <span className="inline-flex items-center gap-1 font-medium text-muted-foreground bg-muted/60 border border-border/80 px-2 py-0.5 rounded-full">
                          <Bot className="w-2.5 h-2.5 text-primary" />
                          Nguồn: AI trực tiếp
                        </span>
                      )}

                      {/* Independent Deterministic Backend Confidence Badge */}
                      {msg.confidence === 'high' && (
                        <span className="inline-flex items-center gap-1 font-bold text-success-fg bg-success-bg border border-success-border px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          Độ tin cậy: Cao
                        </span>
                      )}
                      {msg.confidence === 'medium' && (
                        <span className="inline-flex items-center gap-1 font-semibold text-warning-fg bg-warning-bg border border-warning-border px-2 py-0.5 rounded-full">
                          <Sparkles className="w-2.5 h-2.5" />
                          Độ tin cậy: Trung bình
                        </span>
                      )}
                      {msg.confidence === 'low' && (
                        <span className="inline-flex items-center gap-1 font-medium text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
                          <HelpCircle className="w-2.5 h-2.5" />
                          Độ tin cậy: Tham khảo
                        </span>
                      )}
                    </div>
                  )}

                  {/* Micro-Feedback Thumbs Up/Down for P4 Telemetry */}
                  {msg.sender === 'assistant' && msg.id !== 'welcome-msg' && (
                    <div className="flex items-center gap-2 pt-1 mt-0.5 border-t border-border/40">
                      <span className="text-[10px] text-muted-foreground font-medium">Hữu ích không?</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Hữu ích"
                          aria-label="Phản hồi câu trả lời hữu ích"
                          onClick={() => handleFeedback(msg, true)}
                          className={`p-1 rounded-md transition-colors cursor-pointer ${
                            msg.feedback === true
                              ? 'bg-success-bg text-success-fg border border-success-border font-bold'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          title="Chưa hữu ích"
                          aria-label="Phản hồi câu trả lời chưa hữu ích"
                          onClick={() => handleFeedback(msg, false)}
                          className={`p-1 rounded-md transition-colors cursor-pointer ${
                            msg.feedback === false
                              ? 'bg-destructive/15 text-destructive border border-destructive/30 font-bold'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Quick Action Suggestions */}
            {messages.length === 1 && !isLoading && (
              <div className="pt-1 space-y-1.5 animate-in fade-in duration-200">
                <p className="text-[10px] font-semibold text-muted-foreground px-1">Gợi ý thắc mắc nhanh:</p>
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSend('Tại sao đáp án tôi chọn lại sai?', 'EXPLAIN_WRONG_ANSWER')}
                    className="text-[11px] px-3 py-1.5 rounded-xl bg-card border border-border text-foreground hover:bg-muted font-medium transition-colors text-left cursor-pointer flex items-center justify-between group"
                  >
                    <span>❓ Tại sao đáp án tôi chọn lại sai?</span>
                    <span className="text-[9px] text-muted-foreground group-hover:text-primary transition-colors">EXPLAIN</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend('Hướng dẫn tư duy & cách tiếp cận câu hỏi này?', 'SOLVE_QUESTION')}
                    className="text-[11px] px-3 py-1.5 rounded-xl bg-card border border-border text-foreground hover:bg-muted font-medium transition-colors text-left cursor-pointer flex items-center justify-between group"
                  >
                    <span>💡 Gợi ý tư duy & cách tiếp cận câu này</span>
                    <span className="text-[9px] text-muted-foreground group-hover:text-primary transition-colors">SOLVE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend('Tra cứu câu hỏi tương tự trong ngân hàng đề', 'FIND_SIMILAR_QUESTION')}
                    className="text-[11px] px-3 py-1.5 rounded-xl bg-card border border-border text-foreground hover:bg-muted font-medium transition-colors text-left cursor-pointer flex items-center justify-between group"
                  >
                    <span>🔍 Tra cứu câu tương tự trong ngân hàng đề</span>
                    <span className="text-[9px] text-muted-foreground group-hover:text-primary transition-colors">RETRIEVE</span>
                  </button>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted border border-border rounded-2xl rounded-bl-xs p-3 text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span>AI Assistant đang tra cứu dữ liệu và phân tích...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-border bg-card">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Hỏi AI về đáp án, công thức..."
                disabled={isLoading}
                className="flex-1 h-9 px-3 rounded-xl border border-border bg-background text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
              />
              <Button
                type="submit"
                disabled={!query.trim() || isLoading}
                className="h-9 px-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs hover:bg-primary/90 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Circular Action Button */}
      <button
        type="button"
        title="Trợ lý AI Phòng Thi (DEV ONLY)"
        aria-label="Trợ lý AI Phòng Thi (DEV ONLY)"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-12 h-12 rounded-full bg-primary text-primary-foreground border border-border shadow-lg shadow-primary/25 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer flex items-center justify-center group"
      >
        <Bot className="w-6 h-6 text-primary-foreground group-hover:scale-110 transition-transform" />
      </button>
    </div>
  )
}

// Alias export for backward compatibility
export { QuizAIAssistantDrawer as QuizAIChatbotDrawer }
