'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface ExamTabLeaseResult {
  isReadOnlyTab: boolean
  takeOverLease: () => void
  canWrite: () => boolean
}

/**
 * Local multi-tab coordination for active quiz rooms (BroadcastChannel).
 * Ensures that only one active browser tab holds submission authority for a session.
 * If another tab opens or claims the session, this tab transitions to read-only mode.
 */
export function useExamTabLease(sessionId: string, enabled = true): ExamTabLeaseResult {
  const [leaseState, setLeaseState] = useState({ sessionId: '', readOnly: true })
  const tabIdRef = useRef<string>('')
  const channelRef = useRef<BroadcastChannel | null>(null)
  const authorityRef = useRef({ sessionId: '', writable: false })
  const canWrite = useCallback(() => authorityRef.current.sessionId === sessionId && authorityRef.current.writable, [sessionId])

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
    if (authorityRef.current.sessionId !== sessionId) return
    authorityRef.current.writable = true
    setLeaseState({ sessionId, readOnly: false })
    broadcastClaim(true)
  }, [broadcastClaim, sessionId])

  useEffect(() => {
    authorityRef.current = { sessionId, writable: Boolean(sessionId) }
    setLeaseState({ sessionId, readOnly: false })
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
        if (!data || data.sessionId !== sessionId || authorityRef.current.sessionId !== sessionId) return

        if (data.type === 'CLAIM_LEASE' && data.tabId !== tabIdRef.current) {
          authorityRef.current.writable = false
          setLeaseState({ sessionId, readOnly: true })
        }
      }

      channel.addEventListener('message', handleMessage)
      broadcastClaim(false)

      return () => {
        authorityRef.current.writable = false
        channel?.removeEventListener('message', handleMessage)
        channel?.close()
        channelRef.current = null
      }
    } catch {
      return
    }
  }, [enabled, sessionId, broadcastClaim])

  return { isReadOnlyTab: leaseState.sessionId !== sessionId || leaseState.readOnly, takeOverLease, canWrite }
}
