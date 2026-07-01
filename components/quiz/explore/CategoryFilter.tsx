'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Input } from '@/components/shared/ui/input'
import { Card, CardContent } from '@/components/shared/ui/card'

interface CategoryItem {
  id: string
  name: string
}

export default function CategoryFilter({ initialCategories }: { initialCategories: CategoryItem[] }) {
  const [searchTerm, setSearchTerm] = useState('')

  const filtered = initialCategories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      <div className="mb-10 relative max-w-xl mx-auto">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#5D7B6F]/60 h-6 w-6" />
        <Input 
          placeholder="Tìm môn học (VD: DBS401, NWC303)..." 
          className="pl-16 py-8 text-lg border border-white/60 bg-white/40 backdrop-blur-xl rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus-visible:ring-[#5D7B6F]/20 focus-visible:border-[#5D7B6F]/30 transition-all placeholder:text-slate-400 font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {filtered.map((cat) => (
            <Link key={cat.id} href={`/explore/${encodeURIComponent(cat.name.toLowerCase())}`}>
              <Card
                className="h-32 flex items-center justify-center cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(93,123,111,0.12)] border-2 border-[#5D7B6F]/20 bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden group hover:border-[#5D7B6F]/40"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#A4C3A2]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-4 flex items-center justify-center w-full h-full relative z-10">
                  <span
                    className="text-[17px] sm:text-xl font-bold text-center tracking-wide leading-snug break-words text-[#5D7B6F]"
                  >
                    {cat.name.toUpperCase()}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-slate-500 text-[16px] font-medium border border-white/40 bg-white/30 backdrop-blur-md rounded-3xl">
          Không tìm thấy danh mục môn học nào phù hợp.
        </div>
      )}
    </div>
  )
}
