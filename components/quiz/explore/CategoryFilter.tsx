'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Input } from '@/components/shared/ui/input'
import { Card, CardContent } from '@/components/shared/ui/card'
import { motion } from 'framer-motion'

interface CategoryItem {
  id: string
  name: string
}

export default function CategoryFilter({ initialCategories }: { initialCategories: CategoryItem[] }) {
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = initialCategories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  }

  return (
    <div className="w-full">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mb-14 relative max-w-2xl mx-auto w-full px-4 sm:px-0"
      >
        <div className="relative group">
          {/* Animated Glow Behind Input */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#5D7B6F]/40 to-[#A4C3A2]/40 rounded-[2.5rem] blur-md opacity-20 group-hover:opacity-60 transition duration-700"></div>
          
          <div className="relative flex items-center">
            <Search className="absolute left-6 sm:left-8 text-[#5D7B6F]/70 h-5 w-5 sm:h-6 sm:w-6 pointer-events-none" />
            <Input 
              placeholder="Tìm kiếm môn học (VD: DBS401)..." 
              className="w-full pl-14 sm:pl-16 pr-6 py-6 sm:py-8 text-base sm:text-lg border-2 border-white/80 bg-white/60 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] focus-visible:ring-[#5D7B6F]/30 focus-visible:border-[#5D7B6F]/50 focus-visible:bg-white/90 transition-all duration-300 placeholder:text-slate-400 font-semibold text-slate-800"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </motion.div>

      {filtered.length > 0 ? (
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 px-2 sm:px-0"
        >
          {filtered.map((cat) => (
            <motion.div key={cat.id} variants={item}>
              <Link href={`/explore/${encodeURIComponent(cat.name.toLowerCase())}`} className="block h-full outline-none">
                <Card
                  className="h-28 sm:h-36 flex items-center justify-center cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(93,123,111,0.2)] border border-white/80 hover:border-[#5D7B6F]/40 bg-gradient-to-b from-white/70 to-white/40 hover:from-white/90 hover:to-white/60 backdrop-blur-xl rounded-2xl sm:rounded-3xl overflow-hidden group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#A4C3A2]/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                  
                  {/* Subtle inner highlight */}
                  <div className="absolute inset-0 border border-white rounded-2xl sm:rounded-3xl pointer-events-none opacity-50"></div>

                  <CardContent className="p-3 sm:p-5 flex flex-col items-center justify-center w-full h-full relative z-10 gap-2">
                    <span
                      className="text-[13px] sm:text-[18px] md:text-[20px] font-black text-center tracking-wide leading-tight sm:leading-snug break-words text-slate-700 group-hover:text-[#5D7B6F] transition-colors duration-300 line-clamp-3"
                    >
                      {cat.name.toUpperCase()}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24 text-slate-500 text-lg font-semibold border-2 border-white/60 bg-white/40 backdrop-blur-md rounded-3xl max-w-2xl mx-auto shadow-sm"
        >
          Không tìm thấy danh mục môn học nào phù hợp.
        </motion.div>
      )}
    </div>
  )
}
