'use client'

import { motion, AnimatePresence } from 'framer-motion'

export function DevCodeAndRetryMessage({
  retryAfterSec,
  devCode,
}: {
  retryAfterSec: number | null
  devCode: string
}) {
  return (
    <AnimatePresence>
      {retryAfterSec !== null && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="text-[11px] font-bold text-warning-fg ml-1 mt-1"
        >
          Please try again after {retryAfterSec} seconds.
        </motion.p>
      )}
      {devCode && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="text-[11px] font-bold text-primary ml-1 mt-1"
        >
          Dev test code: {devCode}
        </motion.p>
      )}
    </AnimatePresence>
  )
}
