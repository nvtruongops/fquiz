import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, UploadCloud } from 'lucide-react'

interface QuizEditorHeaderProps {
  quizId?: string
  onOpenUploadModal: () => void
}

export function QuizEditorHeader({ quizId, onOpenUploadModal }: QuizEditorHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3">
        <Link href="/quizzes">
          <Button variant="ghost" size="sm" className="h-9 px-2 text-muted-foreground hover:text-foreground cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {quizId ? 'Edit Quiz' : 'Create New Quiz'}
          </h1>
          <p className="text-xs text-muted-foreground">
            Create and manage official quizzes synchronized directly with the Question Bank
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onOpenUploadModal}
          className="gap-2 text-xs font-semibold cursor-pointer shadow-xs"
        >
          <UploadCloud className="w-4 h-4 text-primary" />
          Upload Quiz File (.TXT / .JSON)
        </Button>
      </div>
    </div>
  )
}
