'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, CheckCircle2, XCircle, ArrowLeft, ShieldCheck } from 'lucide-react'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

function RestoreAccountContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setLoading(false)
      setSuccess(false)
      setMessage('Không tìm thấy mã khôi phục tài khoản trong liên kết.')
      return
    }

    const restore = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/auth/restore-account`, {
          method: 'POST',
          headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ token }),
        })

        const data = await res.json().catch(() => ({}))

        if (!res.ok) {
          setSuccess(false)
          setMessage(data?.error ?? 'Khôi phục tài khoản thất bại hoặc liên kết đã hết hạn.')
          return
        }

        setSuccess(true)
        setMessage(data?.message ?? 'Tài khoản của bạn đã được khôi phục thành công!')
      } catch {
        setSuccess(false)
        setMessage('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng.')
      } finally {
        setLoading(false)
      }
    }

    restore()
  }, [token])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <h2 className="text-lg font-black text-card-foreground">Đang xác thực và khôi phục tài khoản...</h2>
        <p className="text-xs text-muted-foreground font-medium">Vui lòng chờ trong giây lát.</p>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 space-y-6 text-card-foreground">
      <div className="text-center space-y-2">
        <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center bg-card shadow-md border border-border">
          {success ? (
            <CheckCircle2 className="w-8 h-8 text-success-fg" />
          ) : (
            <XCircle className="w-8 h-8 text-destructive" />
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-card-foreground">
          {success ? 'Khôi phục tài khoản thành công!' : 'Khôi phục thất bại'}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed">
          {message}
        </p>
      </div>

      {success && (
        <div className="rounded-2xl bg-success-bg border border-success-border p-4 space-y-2 text-center">
          <div className="flex items-center justify-center gap-1.5 text-success-fg font-bold text-xs">
            <ShieldCheck className="w-4 h-4" /> Tài khoản đã an toàn
          </div>
          <p className="text-[11px] text-success-fg font-medium">
            Lịch xóa tài khoản trong 72 giờ đã được hủy bỏ hoàn toàn. Bạn có thể đăng nhập lại ngay bây giờ.
          </p>
        </div>
      )}

      <div className="pt-2">
        <Link
          href="/login"
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-md transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Trở về trang đăng nhập
        </Link>
      </div>
    </div>
  )
}

export default function RestoreAccountPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-page-bg px-4 py-8">
      <div className="w-full max-w-md bg-card text-card-foreground rounded-3xl border border-border shadow-xl overflow-hidden">
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Đang tải...</p>
            </div>
          }
        >
          <RestoreAccountContent />
        </Suspense>
      </div>
    </div>
  )
}
