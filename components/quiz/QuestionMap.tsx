'use client'

import { useState } from 'react'
import { Map } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'

interface QuestionMapProps {
  totalQuestions: number
  answeredQuestions: Set<number>
  currentIndex: number
  onNavigate: (index: number) => void
  sessionId: string
}

function getCellStyle(
  index: number,
  answeredQuestions: Set<number>,
  currentIndex: number
): string {
  const isAnswered = answeredQuestions.has(index)
  const isCurrent = index === currentIndex

  let bg = isAnswered ? 'bg-[#A4C3A2]' : 'bg-gray-200'
  const border = isCurrent ? 'border-2 border-[#5D7B6F]' : 'border border-transparent'

  return `${bg} ${border} w-9 h-9 rounded text-sm font-medium flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity`
}

function QuestionGrid({
  totalQuestions,
  answeredQuestions,
  currentIndex,
  onCellClick,
}: {
  totalQuestions: number
  answeredQuestions: Set<number>
  currentIndex: number
  onCellClick: (index: number) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: totalQuestions }, (_, i) => (
        <button
          key={i}
          onClick={() => onCellClick(i)}
          className={getCellStyle(i, answeredQuestions, currentIndex)}
          aria-label={`Question ${i + 1}${answeredQuestions.has(i) ? ', answered' : ''}${i === currentIndex ? ', current' : ''}`}
        >
          {i + 1}
        </button>
      ))}
    </div>
  )
}

export default function QuestionMap({
  totalQuestions,
  answeredQuestions,
  currentIndex,
  onNavigate,
}: QuestionMapProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  function handleCellClick(index: number) {
    onNavigate(index)
    setDrawerOpen(false)
  }

  const legend = (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-3">
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded bg-[#A4C3A2] inline-block" /> Đã trả lời
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded bg-gray-200 inline-block" /> Chưa trả lời
      </span>
      <span className="flex items-center gap-1">
        <span className="w-3 h-3 rounded border-2 border-[#5D7B6F] inline-block" /> Đang chọn
      </span>
    </div>
  )

  return (
    <>
      <div className="hidden lg:block">
        <Card className="p-4 sticky top-4">
          <h2 className="text-sm font-semibold mb-3 text-[#5D7B6F]">Bản đồ câu hỏi</h2>
          <QuestionGrid
            totalQuestions={totalQuestions}
            answeredQuestions={answeredQuestions}
            currentIndex={currentIndex}
            onCellClick={handleCellClick}
          />
          {legend}
        </Card>
      </div>

      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button
              size="icon"
              className="rounded-full w-12 h-12 bg-[#5D7B6F] hover:bg-[#4a6459] shadow-lg"
              aria-label="Open question map"
            >
              <Map className="w-5 h-5" />
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="text-[#5D7B6F]">Bản đồ câu hỏi</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6">
              <QuestionGrid
                totalQuestions={totalQuestions}
                answeredQuestions={answeredQuestions}
                currentIndex={currentIndex}
                onCellClick={handleCellClick}
              />
              {legend}
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  )
}
