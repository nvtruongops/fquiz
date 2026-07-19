import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/modules/auth/with-auth'
import { getSettings } from '@/lib/modules/auth/models/SiteSettings'
import { decryptSecret } from '@/lib/core/security/crypto'

export const dynamic = 'force-dynamic'

function isValidLLMUrl(raw: string): { valid: true; url: string } | { valid: false; error: string } {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return { valid: false, error: 'Base URL không hợp lệ' }
  }

  const hostname = parsed.hostname.toLowerCase()
  const isLocal = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '::ffff:127.0.0.1'].includes(hostname)

  // Cho phép http: với localhost/127.0.0.1 cho thử nghiệm Ollama / LM Studio local. Các domain từ xa bắt buộc HTTPS.
  if (!isLocal && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Chỉ hỗ trợ HTTPS cho Custom LLM endpoint từ xa' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Giao thức URL không hợp lệ (chỉ chấp nhận http hoặc https)' }
  }

  // Chặn metadata IP hoặc cloud internal endpoints nguy hiểm
  const blockedInternal = [
    'metadata.google.internal',
    '169.254.169.254',
  ]
  if (blockedInternal.includes(hostname)) {
    return { valid: false, error: 'Không được kết nối tới cloud internal metadata endpoint' }
  }

  if (!isLocal) {
    // Block private IP ranges cho domain bên ngoài ngoại trừ localhost
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(hostname)) {
      return { valid: false, error: 'Không được kết nối tới private network' }
    }

    if (hostname.split('.').length < 2) {
      return { valid: false, error: 'Tên miền không hợp lệ' }
    }
  }

  return { valid: true, url: parsed.origin }
}

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

      const dbSettings = await getSettings()

      if (provider === 'gemini') {
        let key = apiKey
        if (!key || key.startsWith('••••')) {
          key = decryptSecret(dbSettings.llm_config?.gemini?.apiKey || '') || process.env.GEMINI_API_KEY
        }
        if (!key) {
          return NextResponse.json({ error: 'Chưa cấu hình Gemini API Key' }, { status: 400 })
        }
        const modelName = model || dbSettings.llm_config?.gemini?.model || 'gemini-2.0-flash-001'
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
        let key = apiKey
        if (!key || key.startsWith('••••')) {
          key = decryptSecret(dbSettings.llm_config?.openai?.apiKey || '') || process.env.OPENAI_API_KEY
        }
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
        let key = apiKey
        if (!key || key.startsWith('••••')) {
          key = decryptSecret(dbSettings.llm_config?.custom?.apiKey || '')
        }
        const targetUrl = baseUrl || dbSettings.llm_config?.custom?.baseUrl
        if (!targetUrl) {
          return NextResponse.json({ error: 'Chưa nhập Base URL cho Custom LLM' }, { status: 400 })
        }

        const validation = isValidLLMUrl(targetUrl)
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 })
        }

        const cleanUrl = validation.url
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (key) {
          headers['Authorization'] = `Bearer ${key}`
        }

        const res = await fetch(`${cleanUrl}/models`, { headers, method: 'GET' })
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
