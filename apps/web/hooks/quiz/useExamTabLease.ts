'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface ExamTabLeaseResult {
  isReadOnlyTab: boolean
  takeOverLease: () => void
}

/**
 * Authoritative Multi-Tab Lease for active exam rooms (BroadcastChannel).
 * Ensures that only one active browser tab holds submission authority for a session.
 * If another tab opens or claims the session, this tab transitions to read-only mode.
 */
export function useExamTabLease(sessionId: string, enabled = true): ExamTabLeaseResult {
  const [isReadOnlyTab, setIsReadOnlyTab] = useState(false)
  const tabIdRef = useRef<string>('')
  const channelRef = useRef<BroadcastChannel | null>(null)

  if (!tabIdRef.current) {
    tabIdRef.current = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `tab_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`
  }

  const broadcastClaim = useCallback((force = false) => {
    if (channelRef.current) {
      try {
        channelRef.current.postMessage({
          type: 'CLAIM_LEASE',
          tabId: tabIdRef.current,
          sessionId,
          force,
          timestamp: Date.now(),
        })
      } catch {
        /* ignore channel post errors */
      }
    }
  }, [sessionId])

  const takeOverLease = useCallback(() => {
    setIsReadOnlyTab(false)
    broadcastClaim(true)
  }, [broadcastClaim])

  useEffect(() => {
    if (!enabled || !sessionId || typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      return
    }

    let channel: BroadcastChannel | null = null
    try {
      const channelName = `fquiz_exam_lease_${sessionId}`
      channel = new BroadcastChannel(channelName)
      channelRef.current = channel

      const handleMessage = (event: MessageEvent) => {
        const data = event.data
        if (!data || data.sessionId !== sessionId) return

        if (data.type === 'CLAIM_LEASE' && data.tabId !== tabIdRef.current) {
          setIsReadOnlyTab(true)
        }
      }

      channel.addEventListener('message', handleMessage)
      broadcastClaim(false)

      return () => {
        channel?.removeEventListener('message', handleMessage)
        channel?.close()
        channelRef.current = null
      }
    } catch {
      return
    }
  }, [enabled, sessionId, broadcastClaim])

  return { isReadOnlyTab, takeOverLease }
}
