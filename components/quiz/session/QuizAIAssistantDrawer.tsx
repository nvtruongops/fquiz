'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Bot, Send, Loader2, Layers, CheckCircle2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'
import { useAuth } from '@/hooks/auth/useAuth'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

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

interface ChatMessage {
  id: string
  sender: 'user' | 'assistant'
  text: string
  formulaExplanation?: string | null
  similarQuestionFound?: boolean
  similarQuestionDetails?: string | null
  timestamp: Date
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
          text: 'Xin chào! Tôi là Trợ lý AI. Bạn có thể hỏi bất kỳ thắc mắc nào về câu hỏi hiện tại, đối chiếu đáp án hoặc tra cứu câu hỏi tương tự trong Ngân hàng đề.',
          timestamp: new Date(),
        },
      ])
    }
  }, [isOpen, messages.length])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  if (!isDev) return null

  const handleSend = async (customQuery?: string) => {
    const textToSend = (customQuery || query).trim()
    if (!textToSend || isLoading) return

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
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
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div ref={popoverRef} className="fixed bottom-20 right-6 z-50">
      {/* Floating Push-Up Chat Card Box (Positioned above bottom action bar) */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[350px] sm:w-[410px] h-[500px] max-h-[70vh] bg-card text-card-foreground border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="p-3.5 border-b border-border flex items-center justify-between bg-muted/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black text-foreground flex items-center gap-1.5">
                  Trợ Lý AI Làm Bài
                  <span className="px-1.5 py-0.5 rounded-md bg-warning-bg text-warning-fg text-[9px] font-extrabold border border-warning-border uppercase tracking-tight">
                    DEV ONLY
                  </span>
                </h3>
                <p className="text-[10px] text-muted-foreground font-medium">Hỏi đáp & Tra cứu Ngân hàng câu hỏi</p>
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
                  className={`max-w-[88%] rounded-2xl p-3 text-xs font-medium leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-xs shadow-xs font-semibold'
                      : 'bg-muted/80 border border-border text-foreground rounded-bl-xs shadow-xs space-y-2'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {msg.formulaExplanation && (
                    <div className="p-2.5 rounded-xl bg-card border border-border text-foreground text-[11px] font-sans space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-primary">
                        <Layers className="w-3.5 h-3.5 text-primary" />
                        <span>Phân tích công thức:</span>
                      </div>
                      <p className="text-muted-foreground whitespace-pre-wrap">{msg.formulaExplanation}</p>
                    </div>
                  )}

                  {msg.similarQuestionFound && (
                    <div className="p-2.5 rounded-xl bg-info-bg border border-info-border text-info-fg text-[11px] space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-info-fg" />
                        <span>Tìm thấy câu tương tự trong Question Bank:</span>
                      </div>
                      {msg.similarQuestionDetails && (
                        <p className="text-info-fg/90 whitespace-pre-wrap">{msg.similarQuestionDetails}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {messages.length === 1 && !isLoading && (
              <div className="pt-1 space-y-1.5 animate-in fade-in duration-200">
                <p className="text-[10px] font-semibold text-muted-foreground px-1">Gợi ý thắc mắc nhanh:</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSend('Tại sao đáp án tôi chọn lại sai?')}
                    className="text-[11px] px-2.5 py-1 rounded-xl bg-card border border-border text-foreground hover:bg-muted font-medium transition-colors text-left cursor-pointer"
                  >
                    ❓ Tại sao đáp án tôi chọn lại sai?
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend('Giải thích tại sao phương án đúng là phương án này?')}
                    className="text-[11px] px-2.5 py-1 rounded-xl bg-card border border-border text-foreground hover:bg-muted font-medium transition-colors text-left cursor-pointer"
                  >
                    💡 Tại sao phương án đúng lại là đáp án này?
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend('Tra cứu câu hỏi tương tự trong ngân hàng đề')}
                    className="text-[11px] px-2.5 py-1 rounded-xl bg-card border border-border text-foreground hover:bg-muted font-medium transition-colors text-left cursor-pointer"
                  >
                    🔍 Tra cứu câu tương tự trong ngân hàng đề
                  </button>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted border border-border rounded-2xl rounded-bl-xs p-3 text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span>AI Assistant đang tra cứu và suy nghĩ...</span>
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

      {/* Floating Circular Action Button (Theme-Adaptive & Clean Logo) */}
      <button
        type="button"
        title="Trợ lý AI (DEV ONLY)"
        aria-label="Trợ lý AI (DEV ONLY)"
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
