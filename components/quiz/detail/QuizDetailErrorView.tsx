'use client'

import React from 'react'
import Link from 'next/link'
import { AlertCircle, ShieldCheck, HelpCircle } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'

interface QuizDetailErrorViewProps {
  error: any
  router: any
}

export function QuizDetailErrorView({ error, router }: QuizDetailErrorViewProps) {
  const status = error?.status
  const code = error?.code
  const message = error?.message || 'Không thể tải thông tin đề thi này.'
  const hint = error?.hint

  return (
    <div className="min-h-screen bg-background p-4 text-center">
      <div className="mx-auto mt-24 max-w-md rounded-2xl border border-border bg-card p-10 shadow-xl">
        {status === 403 ? (
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
            <ShieldCheck className="h-8 w-8 text-amber-400" />
          </div>
        ) : status === 404 ? (
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <HelpCircle className="h-8 w-8 text-muted-foreground" />
          </div>
        ) : (
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
        )}

        <h2 className="mb-2 text-xl font-black uppercase tracking-tight text-foreground">
          {status === 403
            ? 'Không có quyền truy cập'
            : status === 404
              ? 'Không tìm thấy bộ đề'
              : code === 'QUIZ_SOURCE_LOCKED'
                ? 'Không thể làm lại quiz này'
                : 'Đã xảy ra lỗi'}
        </h2>

        <p className="mb-8 font-medium text-muted-foreground">{message}</p>

        {hint && <p className="mb-6 text-sm text-muted-foreground">{hint}</p>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {code === 'QUIZ_SOURCE_LOCKED' ? (
            <>
              <Button asChild className="bg-primary text-primary-foreground py-6">
                <Link href="/my-quizzes">Về Bộ đề của tôi</Link>
              </Button>
              <Button asChild variant="outline" className="py-6 border-border">
                <Link href="/history">Xem Lịch sử</Link>
              </Button>
            </>
          ) : status === 403 ? (
            <>
              <Button asChild className="bg-primary text-primary-foreground py-6">
                <Link href="/">Khám phá bộ đề</Link>
              </Button>
              <Button asChild variant="outline" className="py-6 border-border">
                <Link href="/my-quizzes">Bộ đề của tôi</Link>
              </Button>
            </>
          ) : (
            <Button onClick={() => router.back()} className="col-span-2 w-full bg-primary text-primary-foreground py-6">
              Quay lại
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
