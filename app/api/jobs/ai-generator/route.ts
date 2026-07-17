import { NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectDB } from '@/lib/core/db/mongodb'
import { verifyQStashRequest } from '@/lib/core/queue/qstash'
import { AIAsset } from '@/lib/modules/ai/models/AIAsset'
import { eventBus } from '@/lib/core/events/event-bus'

/**
 * POST /api/jobs/ai-generator
 * QStash callback for async AI content generation.
 *
 * Expects body:
 *   { assetId, content?, aiModel?, requestTokens?, responseTokens?, cost?, durationMs?, error? }
 *
 * On success: updates AIAsset status → 'completed', stores content.
 * On failure: updates AIAsset status → 'failed', stores errorMessage.
 */
export async function POST(req: Request) {
  const verification = await verifyQStashRequest(req)
  if (!verification.isValid) {
    return new Response(verification.error ?? 'Unauthorized', { status: verification.status })
  }

  try {
    const body = JSON.parse(verification.bodyText)
    const { assetId } = body

    if (!assetId || typeof assetId !== 'string') {
      return NextResponse.json({ error: 'Missing assetId' }, { status: 400 })
    }

    await connectDB()

    const isError = Boolean(body.error)

    const updateFields: Record<string, unknown> = {
      providerResponseId: `qstash-${Date.now()}`,
    }

    if (isError) {
      updateFields.status = 'failed'
      updateFields.errorMessage = String(body.error)
      updateFields.retryCount = 1
    } else {
      updateFields.status = 'completed'
      updateFields.responseHash = JSON.stringify(body.content ?? {})
      if (body.aiModel) updateFields.aiModel = body.aiModel
      if (typeof body.requestTokens === 'number') updateFields.requestTokens = body.requestTokens
      if (typeof body.responseTokens === 'number') updateFields.responseTokens = body.responseTokens
      if (typeof body.cost === 'number') updateFields.cost = body.cost
      if (typeof body.durationMs === 'number') updateFields.durationMs = body.durationMs
    }

    const asset = await AIAsset.findByIdAndUpdate(
      assetId,
      { $set: updateFields },
      { new: true }
    ).lean()

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    if (!isError) {
      eventBus.emit({
        eventId: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        eventType: 'AIAssetGenerated',
        occurredAt: new Date(),
        version: 1,
        aggregateId: new Types.ObjectId(assetId),
        aggregateType: 'AIAsset',
        payload: {
          assetId,
          sourceType: asset.sourceType,
          sourceId: asset.sourceId.toString(),
          provider: 'gemini',
          model: body.aiModel ?? asset.aiModel ?? 'gemini-2.0-flash-001',
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[QStash] AI Generator Job Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
