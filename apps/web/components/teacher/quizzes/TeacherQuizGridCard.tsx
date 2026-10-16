'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardFooter } from '@/components/shared/ui/card'
import { Button } from '@/components/shared/ui/button'
import { Send, Edit3, Trash2 } from 'lucide-react'
import { QuizItem } from '@/hooks/useTeacherQuizzes'

interface TeacherQuizGridCardProps {
  quiz: QuizItem
  isConfirmingDelete: boolean
  onOpenAssign: (quiz: QuizItem) => void
  onConfirmDelete: (id: string | null) => void
  onDelete: (id: string) => void
}

export function TeacherQuizGridCard({
  quiz,
  isConfirmingDelete,
  onOpenAssign,
  onConfirmDelete,
  onDelete,
}: TeacherQuizGridCardProps) {
  return (
    <Card className="border border-border shadow-xs hover:shadow-md transition-all flex flex-col justify-between rounded-2xl bg-card overflow-hidden">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
            {quiz.course_code}
          </span>
          <span className="text-xs font-bold text-muted-foreground">{quiz.questionCount} questions</span>
        </div>
        <CardTitle className="text-base font-black text-card-foreground line-clamp-2 mt-2">
          {quiz.title}
        </CardTitle>
      </CardHeader>
      <CardFooter className="p-5 pt-3 border-t border-border flex items-center justify-between gap-2">
        <Button
          onClick={() => onOpenAssign(quiz)}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl gap-1.5 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" /> Assign
        </Button>
        <div className="flex items-center gap-1">
          <Link href={`/admin/quizzes/${quiz._id}/edit`}>
            <Button size="sm" variant="ghost">
              <Edit3 className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </Link>
          {isConfirmingDelete ? (
            <Button
              size="sm"
              onClick={() => onDelete(quiz._id)}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold rounded-lg cursor-pointer"
            >
              Confirm
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => onConfirmDelete(quiz._id)}>
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
