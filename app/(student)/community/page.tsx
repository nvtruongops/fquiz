'use client'

import React, { useState, useRef } from 'react'
import {
  Sparkles,
  Bug,
  Lightbulb,
  BookOpen,
  MessageCircle,
  Send,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { withCsrfHeaders } from '@/lib/csrf'

const FEEDBACK_TYPES = [
  { value: 'bug',     label: 'Báo lỗi',          icon: Bug },
  { value: 'feature', label: 'Đề xuất tính năng', icon: Lightbulb },
  { value: 'content', label: 'Góp ý nội dung',    icon: BookOpen },
  { value: 'other',   label: 'Khác',              icon: MessageCircle },
] as const

type FeedbackType = typeof FEEDBACK_TYPES[number]['value']

// Client-side rate limit: 3 lần / 60 phút
const RATE_LIMIT = 3
const RATE_WINDOW_MS = 60 * 60 * 1000

export default function CommunityPage() {
  const [type, setType] = useState<FeedbackType>('feature')
  const [message, setMessage] = useState('')
  const [reason, setReason] = useState('')   // ô lý do khi chọn "Khác"
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [rateLimited, setRateLimited] = useState(false)
  const [cooldownSec, setCooldownSec] = useState(0)

  // Client-side rate limit tracking
  const submitTimestamps = useRef<number[]>([])
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const isOther = type === 'other'
  // Nội dung cuối cùng gửi lên: nếu "Khác" thì ghép reason + message
  const finalMessage = isOther
    ? [reason.trim(), message.trim()].filter(Boolean).join('\n\n')
    : message.trim()

  const canSubmit = !loading && !rateLimited && 
    (isOther 
      ? (reason.trim().length >= 5 && message.trim().length >= 5)
      : (message.trim().length >= 5)
    )

  function startCooldown(remainMs: number) {
    setRateLimited(true)
    setCooldownSec(Math.ceil(remainMs / 1000))
    if (cooldownTimer.current) clearInterval(cooldownTimer.current)
    cooldownTimer.current = setInterval(() => {
      setCooldownSec(prev => {
        if (prev <= 1) {
          clearInterval(cooldownTimer.current!)
          setRateLimited(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function checkClientRateLimit(): boolean {
    const now = Date.now()
    submitTimestamps.current = submitTimestamps.current.filter(t => now - t < RATE_WINDOW_MS)
    if (submitTimestamps.current.length >= RATE_LIMIT) {
      const oldest = submitTimestamps.current[0]
      const remainMs = RATE_WINDOW_MS - (now - oldest)
      startCooldown(remainMs)
      return false
    }
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    // Validate trước khi gửi
    if (isOther) {
      if (reason.trim().length < 5) {
        setError('Lý do phải có ít nhất 5 ký tự')
        return
      }
      if (message.trim().length < 5) {
        setError('Nội dung góp ý phải có ít nhất 5 ký tự')
        return
      }
    } else {
      if (message.trim().length < 5) {
        setError('Nội dung góp ý phải có ít nhất 5 ký tự')
        return
      }
    }

    if (!checkClientRateLimit()) {
      setError('Bạn đã gửi quá nhiều góp ý. Vui lòng thử lại sau.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/feedback`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ type, message: finalMessage }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 429) {
          startCooldown(60 * 60 * 1000)
          setError(data.error || 'Quá nhiều góp ý. Vui lòng thử lại sau.')
        } else if (res.status === 400) {
          // Hiển thị lỗi validation từ server
          if (data.details && Array.isArray(data.details)) {
            setError(data.details[0]?.message || data.error || 'Dữ liệu không hợp lệ')
          } else {
            setError(data.error || 'Dữ liệu không hợp lệ')
          }
        } else {
          setError(data.error || 'Gửi thất bại. Vui lòng thử lại.')
        }
        return
      }
      submitTimestamps.current.push(Date.now())
      setSuccess(true)
      setMessage('')
      setReason('')
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 animate-in fade-in duration-500">

      {/* Header */}
      <section className="text-center space-y-2 mb-5">
        <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-[#5D7B6F]/5 border border-[#5D7B6F]/10 text-[#5D7B6F] font-black text-[10px] uppercase tracking-[0.2em]">
          <Sparkles className="w-3.5 h-3.5" /> Cộng đồng FQuiz
        </div>
        <h1 className="text-3xl font-black text-[#5D7B6F] tracking-tight">
          Góp ý cho chúng tôi
        </h1>
        <p className="text-gray-400 font-medium text-sm leading-relaxed">
          Ý kiến của bạn giúp FQuiz ngày càng tốt hơn.
        </p>
      </section>

      {success ? (
        <div className="flex flex-col items-center justify-center text-center space-y-6 py-16">
          <div className="w-16 h-16 rounded-full bg-[#5D7B6F]/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-[#5D7B6F]" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-gray-800">Cảm ơn bạn!</h3>
            <p className="text-gray-400 font-medium text-sm">
              Góp ý của bạn đã được gửi đến đội ngũ phát triển.
            </p>
          </div>
          <Button
            onClick={() => setSuccess(false)}
            variant="outline"
            className="rounded-2xl border-[#5D7B6F]/30 text-[#5D7B6F] font-black hover:bg-[#5D7B6F]/5"
          >
            Gửi thêm góp ý
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Type selector */}
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-widest">
              Loại góp ý
            </label>
            <div className="grid grid-cols-4 gap-2">
              {FEEDBACK_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setType(value); setError('') }}
                  className={cn(
                    'flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl border-2 text-sm font-bold transition-all',
                    type === value
                      ? 'border-[#5D7B6F] bg-[#5D7B6F] text-white'
                      : 'border-gray-100 bg-white text-gray-500 hover:border-[#5D7B6F]/30 hover:text-[#5D7B6F]'
                  )}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  <span className="text-[10px] font-black text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Ô lý do — chỉ hiện khi chọn "Khác" */}
          <div
            className="overflow-hidden transition-all duration-200"
            style={{ maxHeight: isOther ? '120px' : '0px', opacity: isOther ? 1 : 0 }}
          >
            <div className="space-y-1.5">
              <label className="text-xs font-black text-gray-500 uppercase tracking-widest">
                Lý do
              </label>
              <Textarea
                value={reason}
                onChange={(e) => { setReason(e.target.value.slice(0, 200)); setError('') }}
                placeholder="Cho chúng tôi biết lý do cụ thể..."
                className="h-[68px] rounded-2xl border-2 border-gray-100 focus:border-[#5D7B6F] font-medium resize-none text-sm"
                tabIndex={isOther ? 0 : -1}
              />
              <p className={cn('text-xs font-bold text-right', 200 - reason.length < 20 ? 'text-orange-500' : 'text-gray-300')}>
                {200 - reason.length} ký tự còn lại
              </p>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-500 uppercase tracking-widest">
              Nội dung góp ý
            </label>
            <Textarea
              value={message}
              onChange={(e) => { setMessage(e.target.value.slice(0, 1000)); setError('') }}
              placeholder="Mô tả chi tiết góp ý của bạn..."
              className="h-[160px] rounded-2xl border-2 border-gray-100 focus:border-[#5D7B6F] font-medium resize-none text-sm"
            />
            <div className="flex justify-between items-center">
              {error
                ? <p className="text-xs font-bold text-red-500">{error}</p>
                : <span />
              }
              <p className={cn('text-xs font-bold', 1000 - message.length < 50 ? 'text-orange-500' : 'text-gray-300')}>
                {1000 - message.length} ký tự còn lại
              </p>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="w-full h-12 rounded-2xl bg-[#5D7B6F] hover:bg-[#4a6358] font-black text-sm uppercase tracking-widest disabled:opacity-40 transition-all active:scale-[0.98]"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={1.5} /> Đang gửi...</>
            ) : rateLimited ? (
              `Thử lại sau ${Math.floor(cooldownSec / 60)}:${String(cooldownSec % 60).padStart(2, '0')}`
            ) : (
              <><Send className="w-4 h-4 mr-2" strokeWidth={1.5} /> Gửi góp ý</>
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
