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
          className="text-[11px] font-bold text-[#d97706] ml-1 mt-1"
        >
          Vui lòng thử lại sau {retryAfterSec} giây.
        </motion.p>
      )}
      {devCode && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="text-[11px] font-bold text-[#5D7B6F] ml-1 mt-1"
        >
          Mã test (dev): {devCode}
        </motion.p>
      )}
    </AnimatePresence>
  )
}
