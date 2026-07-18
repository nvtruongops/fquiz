import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'

export const dynamic = 'force-dynamic'

export const POST = withAuth(
  async (req: Request) => {
    try {
      let body: any
      try {
        body = await req.json()
      } catch {
        return NextResponse.json({ error: 'Dữ liệu JSON không hợp lệ' }, { status: 400 })
      }

      const { provider, apiKey, model, baseUrl } = body ?? {}

      if (!provider) {
        return NextResponse.json({ error: 'Vui lòng chọn nhà cung cấp LLM (provider)' }, { status: 400 })
      }

      if (provider === 'gemini') {
        const key = apiKey || process.env.GEMINI_API_KEY
        if (!key) {
          return NextResponse.json({ error: 'Chưa cấu hình Gemini API Key' }, { status: 400 })
        }
        const modelName = model || 'gemini-2.0-flash-001'
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}?key=${key}`
        )
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          return NextResponse.json(
            { error: errData.error?.message || `Lỗi Gemini API (HTTP ${res.status})` },
            { status: 400 }
          )
        }
        return NextResponse.json({ success: true, message: `Kết nối thành công tới Gemini (${modelName})!` })
      }

      if (provider === 'openai') {
        const key = apiKey || process.env.OPENAI_API_KEY
        if (!key) {
          return NextResponse.json({ error: 'Chưa cấu hình OpenAI API Key' }, { status: 400 })
        }
        const res = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        })
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          return NextResponse.json(
            { error: errData.error?.message || `Lỗi OpenAI API (HTTP ${res.status})` },
            { status: 400 }
          )
        }
        return NextResponse.json({ success: true, message: 'Kết nối thành công tới OpenAI API!' })
      }

      if (provider === 'custom') {
        if (!baseUrl) {
          return NextResponse.json({ error: 'Chưa nhập Base URL cho Custom LLM' }, { status: 400 })
        }
        const cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`
        }
        
        const modelsUrl = cleanUrl.endsWith('/v1') ? `${cleanUrl}/models` : `${cleanUrl}/v1/models`
        const res = await fetch(modelsUrl, { headers, method: 'GET' })
        if (!res.ok) {
          const res2 = await fetch(cleanUrl, { headers, method: 'GET' }).catch(() => null)
          if (!res2 || !res2.ok) {
            return NextResponse.json(
              { error: `Không thể kết nối tới Custom LLM tại ${cleanUrl} (HTTP ${res.status})` },
              { status: 400 }
            )
          }
        }
        return NextResponse.json({ success: true, message: `Kết nối thành công tới Custom LLM (${cleanUrl})!` })
      }

      return NextResponse.json({ error: 'Provider không hợp lệ' }, { status: 400 })
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Lỗi kiểm tra kết nối' }, { status: 500 })
    }
  },
  { roles: ['admin'] }
)
