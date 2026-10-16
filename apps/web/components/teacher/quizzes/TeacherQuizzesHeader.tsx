'use client'

import React from 'react'
import Link from 'next/link'
import { FileText, Plus, FolderPlus } from 'lucide-react'
import { Button } from '@/components/shared/ui/button'

interface TeacherQuizzesHeaderProps {
  onCreateCategoryOpen: () => void
}

export function TeacherQuizzesHeader({ onCreateCategoryOpen }: TeacherQuizzesHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
            Teacher Dashboard
          </span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-card-foreground flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          Quiz &amp; Course Code Management
        </h1>
        <p className="text-sm font-medium text-muted-foreground mt-1">
          Create course codes, build quiz sets, and assign quizzes to your classrooms.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={onCreateCategoryOpen}
          variant="outline"
          className="border-primary/30 text-primary hover:bg-primary/10 font-bold gap-2 rounded-xl h-11 px-4 transition-all cursor-pointer"
        >
          <FolderPlus className="w-5 h-5" /> + Create Course Code
        </Button>

        <Link href="/teacher/quizzes/new">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 font-bold gap-2 rounded-xl h-11 px-5 transition-all cursor-pointer">
            <Plus className="w-5 h-5" /> Create New Quiz
          </Button>
        </Link>
      </div>
    </div>
  )
}
