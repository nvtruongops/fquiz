'use client'

import React from 'react'
import Link from 'next/link'
import { useTranslations } from '@fquiz/ui/i18n'

interface QuizDetailHeaderProps {
  quiz: {
    title: string
    category_id: { name: string }
    course_code: string
    description?: string
    is_temp?: boolean
  } | null
  resolvedQuizId: string
}

export function QuizDetailHeader({ quiz, resolvedQuizId }: QuizDetailHeaderProps) {
  const t = useTranslations()
  const rawCode = quiz?.course_code || ''
  const baseCourseCode = rawCode ? rawCode.split('_')[0].toLowerCase() : ''
  const displayCourseCode = rawCode ? rawCode.split('_')[0].toUpperCase() : ''
  const categoryName = quiz?.category_id?.name
  const courseBadgeText = displayCourseCode || (categoryName && categoryName !== 'Chung' && categoryName !== 'General' ? categoryName : t('common.general'))
  const mixedTitlePrefix = quiz?.is_temp
    ? ['Quiz Tr\u1ED9n · ', 'Mixed Quiz · '].find((prefix) => quiz.title.startsWith(prefix))
    : undefined

  return (
    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-border bg-card p-3.5 sm:p-6 shadow-xs">
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/5 blur-2xl" />
      
      <div className="relative space-y-3 sm:space-y-6">
        <div className="flex items-center gap-3">
          {baseCourseCode ? (
            <Link
              href={`/courses/${baseCourseCode}`}
              className="rounded-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1 sm:px-4 sm:py-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-colors"
            >
              {t('quizDetail.courseLabel')} {courseBadgeText}
            </Link>
          ) : (
            <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 sm:px-4 sm:py-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
              {t('quizDetail.courseLabel')} {courseBadgeText}
            </span>
          )}
          <div className="h-3 w-px bg-border" />
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {t('quizDetail.idLabel')} {resolvedQuizId.slice(-8).toUpperCase()}
          </span>
        </div>

        <h1 className={`font-extrabold tracking-tight text-foreground break-words ${quiz?.is_temp ? 'text-lg sm:text-2xl lg:text-3xl' : 'text-xl sm:text-3xl lg:text-4xl leading-snug sm:leading-tight'}`}>
          {quiz?.is_temp ? (
            mixedTitlePrefix ? (
              <>
                <span className="block text-sm sm:text-lg lg:text-xl text-muted-foreground font-medium mb-1">{t('quizDetail.mixedQuiz')}</span>
                <span className="block leading-snug">{quiz.title.slice(mixedTitlePrefix.length).split(' + ').join(' +\u00A0')}</span>
              </>
            ) : (
              quiz.title.split(' + ').join(' +\u00A0')
            )
          ) : (
            (quiz?.title || quiz?.course_code)?.replaceAll('_', '_\u200B')
          )}
        </h1>

        {quiz?.description && (
          <div className="max-w-2xl border-l-2 border-primary py-0.5 pl-4 sm:pl-8">
            <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary mb-1 opacity-60">{t('quizDetail.description')}</p>
            <p className="text-xs sm:text-[13px] font-medium leading-relaxed text-muted-foreground whitespace-pre-wrap">{quiz.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}
