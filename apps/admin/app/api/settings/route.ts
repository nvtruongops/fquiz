import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/mongodb'
import { withAuth } from '@/lib/auth/with-auth'
import { SiteSettings, getSettings, clearSettingsCache } from '@/lib/models/SiteSettings'
import { UpdateSiteSettingsSchema } from '@/lib/schemas/common'
import { encryptSecret, maskApiKey } from '@/lib/security/crypto'

export const dynamic = 'force-dynamic'

function sanitizeSettingsForClient(rawSettings: any) {
  const settings = JSON.parse(JSON.stringify(rawSettings))
  if (settings && settings.llm_config) {
    const providers = ['gemini', 'openai', 'custom'] as const
    for (const provider of providers) {
      if (settings.llm_config[provider]) {
        const key = settings.llm_config[provider].apiKey || ''
        settings.llm_config[provider].hasApiKey = Boolean(key)
        settings.llm_config[provider].apiKeyMasked = maskApiKey(key)
        settings.llm_config[provider].apiKey = ''
      }
    }
  }
  return settings
}

export const GET = withAuth(async () => {
  try {
    await connectDB()
    const rawSettings = await getSettings()
    const settings = sanitizeSettingsForClient(rawSettings)

    const response = NextResponse.json({ settings })
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    return response
  } catch (err) {
    console.error('Error getting settings:', err)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
})

export const PUT = withAuth(async (req: Request) => {
  try {
    await connectDB()
    const body = await req.json().catch(() => ({}))

    const parsed = UpdateSiteSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const existing = await getSettings()
    const updates: Record<string, any> = {}
    Object.entries(parsed.data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates[key] = value
      }
    })

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    if (updates.llm_config) {
      const mergedLlmConfig = {
        ...(existing.llm_config || {}),
        ...updates.llm_config,
      }

      const providers = ['gemini', 'openai', 'custom'] as const
      for (const provider of providers) {
        const submittedProviderObj = updates.llm_config[provider]
        const existingProviderObj = (existing.llm_config as any)?.[provider] || {}

        if (submittedProviderObj) {
          const submittedKey = (submittedProviderObj.apiKey || '').trim()
          const existingKey = existingProviderObj.apiKey || ''

          if (submittedKey && !submittedKey.startsWith('••••')) {
            mergedLlmConfig[provider].apiKey = encryptSecret(submittedKey)
          } else {
            mergedLlmConfig[provider].apiKey = existingKey
          }
        } else if (existingProviderObj) {
          mergedLlmConfig[provider] = { ...existingProviderObj }
        }
      }

      updates.llm_config = mergedLlmConfig
    }

    const collection = SiteSettings.collection
    await collection.updateOne(
      { _id: existing._id },
      { $set: updates }
    )
    const updatedRaw = await collection.findOne({ _id: existing._id })

    clearSettingsCache()

    const settings = sanitizeSettingsForClient(updatedRaw)
    return NextResponse.json({ settings })
  } catch (err) {
    console.error('Error updating settings:', err)
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
})
