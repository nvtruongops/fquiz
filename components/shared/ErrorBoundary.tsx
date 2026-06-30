'use client'

import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  fallback?: ReactNode
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex h-screen items-center justify-center bg-[#f3f3f3] font-sans">
          <div className="max-w-sm border-2 border-[#101010] bg-white p-6 text-center">
            <h2 className="text-[26px] font-bold text-[#111111]">Có lỗi xảy ra</h2>
            <p className="mt-2 text-[16px] text-[#444444]">
              Vui lòng thử tải lại trang. Nếu lỗi vẫn tiếp diễn, hãy liên hệ hỗ trợ.
            </p>
            <button
              onClick={() => globalThis.location.reload()}
              className="mt-5 rounded-none border-2 border-[#101010] bg-[#efefef] px-6 py-2 text-[18px] font-semibold text-[#111111] hover:bg-white"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
