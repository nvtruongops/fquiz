'use client'

import React from 'react'
import Link from 'next/link'
import { AlertCircle, ShieldCheck, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
    <div className="h-screen bg-[#EAE7D6]/30 p-4 text-center">
      <div className="mx-auto mt-24 max-w-md rounded-2xl border-2 border-gray-100 bg-white p-10 shadow-xl">
        {status === 403 ? (
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
            <ShieldCheck className="h-8 w-8 text-orange-400" />
          </div>
        ) : status === 404 ? (
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-50">
            <HelpCircle className="h-8 w-8 text-gray-400" />
          </div>
        ) : (
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
        )}

        <h2 className="mb-2 text-xl font-black uppercase tracking-tight">
          {status === 403
            ? 'Không có quyền truy cập'
            : status === 404
              ? 'Không tìm thấy bộ đề'
              : code === 'QUIZ_SOURCE_LOCKED'
                ? 'Không thể làm lại quiz này'
                : 'Đã xảy ra lỗi'}
        </h2>

        <p className="mb-8 font-medium text-gray-500">{message}</p>

        {hint && <p className="mb-6 text-sm text-gray-400">{hint}</p>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {code === 'QUIZ_SOURCE_LOCKED' ? (
            <>
              <Button asChild className="bg-[#5D7B6F] py-6 text-white">
                <Link href="/my-quizzes">Về Bộ đề của tôi</Link>
              </Button>
              <Button asChild variant="outline" className="py-6">
                <Link href="/history">Xem Lịch sử</Link>
              </Button>
            </>
          ) : status === 403 ? (
            <>
              <Button asChild className="bg-[#5D7B6F] py-6 text-white">
                <Link href="/explore">Khám phá bộ đề</Link>
              </Button>
              <Button asChild variant="outline" className="py-6">
                <Link href="/my-quizzes">Bộ đề của tôi</Link>
              </Button>
            </>
          ) : (
            <Button onClick={() => router.back()} className="col-span-2 w-full bg-[#5D7B6F] py-6 text-white">
              Quay lại
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
