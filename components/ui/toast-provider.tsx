'use client'

import { useToast } from '@/lib/store/toast-store'
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function ToastProvider() {
  const { toasts, removeToast } = useToast()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) return null

  return (
    <div className="fixed bottom-0 right-0 z-[100] p-6 w-full max-w-[420px] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto
            relative overflow-hidden
            flex items-start gap-3 p-4 rounded-2xl shadow-2xl border
            bg-white/90 backdrop-blur-xl
            animate-in fade-in slide-in-from-right-8 duration-300
            ${toast.type === 'success' ? 'border-[#A4C3A2]/50' : ''}
            ${toast.type === 'error' ? 'border-red-200' : ''}
            ${toast.type === 'info' ? 'border-[#D7F9FA]/50' : ''}
          `}
        >
          <div className="flex-shrink-0 mt-0.5">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#5D7B6F]" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
            {toast.type === 'info' && <AlertCircle className="w-5 h-5 text-blue-500" />}
          </div>
          
          <div className="flex-1 min-w-0 pr-6">
            <p className={`text-sm font-bold leading-relaxed ${toast.type === 'error' ? 'text-red-700' : 'text-gray-900'}`}>
              {toast.message}
            </p>
          </div>

          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Progress Bar Animation */}
          <div className="absolute bottom-0 left-0 h-1 bg-gray-100 w-full overflow-hidden rounded-b-2xl opacity-30">
            <div 
              className={`h-full transition-[width] ease-linear
                ${toast.type === 'success' ? 'bg-[#5D7B6F]' : 'bg-red-500'}`}
              style={{ width: '0%', transitionDuration: '5000ms' }}
              ref={(el) => {
                if (el) setTimeout(() => { el.style.width = '100%' }, 10)
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
