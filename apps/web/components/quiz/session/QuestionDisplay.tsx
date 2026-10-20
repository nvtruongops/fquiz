'use client'

import React from 'react'
import { CheckCircle2, XCircle, Bookmark, ChevronRight, PenTool } from 'lucide-react'
import { cn } from '@/lib/core/utils/cn'
import { SessionQuestion, QuestionFeedback } from '@/lib/modules/quiz/types/session'
import { UsageBadge } from '@/components/quiz/shared/UsageBadge'
import { usePinnedQuestions } from '@/hooks/quiz/usePinnedQuestions'
import { InteractiveText } from '@/components/shared/selection/InteractiveText'
import { handleArrowOptionNavigation } from '@/components/quiz/option-keyboard-navigation'

interface QuestionDisplayProps {
  question: SessionQuestion
  currentIndex: number
  totalQuestions: number
  selectedOptions: number[]
  submitted: boolean
  showImmediateFeedback: boolean
  lastAnswerResult: QuestionFeedback | null
  onSelectOption: (idx: number) => void
  onNavigate?: (idx: number) => void
  navigationDisabled?: boolean
  onSubmit?: () => void
  onExit?: () => void
  isPending: boolean
  submitDisabled?: boolean
  sessionMode: 'immediate' | 'review' | 'flashcard'
  enableAnimation?: boolean
  isExplanationOpen?: boolean
  onToggleExplanation?: () => void
  isNoteMode?: boolean
  onToggleNoteMode?: () => void
  courseCode?: string
  quizTitle?: string
  quizId?: string
  focusedOption?: number | null
}

function handleStandardOptionArrowKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, optionIndex: number, optionCount: number, onSelectOption: (index: number) => void) {
  handleArrowOptionNavigation(event, optionIndex, optionCount, onSelectOption, (nextIndex) => {
    const options = event.currentTarget.closest('[role="radiogroup"]')?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    options?.item(nextIndex)?.focus()
  })
}

function useQuestionPin({
  question,
  showImmediateFeedback,
  lastAnswerResult,
  courseCode,
  quizTitle,
  quizId,
}: Pick<QuestionDisplayProps, 'question' | 'showImmediateFeedback' | 'lastAnswerResult' | 'courseCode' | 'quizTitle' | 'quizId'>) {
  const { pinnedQuestions, togglePinMutation } = usePinnedQuestions(courseCode, {
    enabled: Boolean(courseCode),
  })
  const isPinned = pinnedQuestions.some(
    (p) => (p.question_id && p.question_id === question._id) || p.text === question.text
  )

  const handleTogglePin = () => {
    const pinCorrectAnswer = showImmediateFeedback && lastAnswerResult?.correctAnswers
      ? lastAnswerResult.correctAnswers
      : (Array.isArray((question as any).correct_answer)
          ? (question as any).correct_answer
          : typeof (question as any).correct_answer === 'number'
            ? [(question as any).correct_answer]
            : [])

    togglePinMutation.mutate({
      question_id: question._id,
      quiz_id: quizId,
      quiz_title: quizTitle || courseCode,
      course_code: courseCode || 'GENERAL',
      text: question.text,
      options: question.options,
      correct_answer: pinCorrectAnswer,
      explanation: lastAnswerResult?.explanation || (question as any).explanation || '',
      image_url: question.image_url || '',
    })
  }

  return { isPinned, togglePinMutation, handleTogglePin }
}

function normalizeCorrectAnswers(answer: number | number[] | undefined) {
  if (answer === undefined) return []
  return Array.isArray(answer) ? answer : [answer]
}

function getFeedbackCorrectAnswers(question: SessionQuestion, lastAnswerResult: QuestionFeedback | null) {
  const feedbackAnswer = lastAnswerResult?.correctAnswer
  if (feedbackAnswer !== undefined) return [feedbackAnswer]
  return normalizeCorrectAnswers(question.correct_answer)
}

function getQuestionCorrectAnswers(question: SessionQuestion, lastAnswerResult: QuestionFeedback | null) {
  const feedbackAnswers = lastAnswerResult?.correctAnswers
  if (feedbackAnswers) return feedbackAnswers
  return getFeedbackCorrectAnswers(question, lastAnswerResult)
}

function useQuestionDisplayState(props: Pick<QuestionDisplayProps, 'question' | 'currentIndex' | 'totalQuestions' | 'showImmediateFeedback' | 'lastAnswerResult' | 'courseCode' | 'quizTitle' | 'quizId'>) {
  const requiredSelectionCount = Math.max(props.question.answer_selection_count ?? 1, 1)
  const correctAnswerSet = props.showImmediateFeedback
    ? getQuestionCorrectAnswers(props.question, props.lastAnswerResult)
    : []
  const safeDisplayIndex = Math.min(Math.max(props.currentIndex, 0), Math.max(props.totalQuestions - 1, 0)) + 1
  const pin = useQuestionPin(props)
  return { requiredSelectionCount, isSingleAnswer: requiredSelectionCount === 1, correctAnswerSet, safeDisplayIndex, ...pin }
}

/**
 * Standard / EOS Exam Minimal View (enableAnimation = false)
 * - Ultra-minimal flat exam UI (Image 1 style)
 * - Left column: Answer checkboxes (A, B, C, D) + Back/Next buttons
 * - Red vertical divider line: Click & Drag left/right to resize columns
 * - Right panel: Flat question text & options A., B., C., D. near top margin
 * - Zero CSS transition animations
 */
function useResizableQuestionPanel() {
  const [leftWidth, setLeftWidth] = React.useState(220)
  const isDraggingRef = React.useRef(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const handleMouseDown = React.useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    isDraggingRef.current = true
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return
      const width = moveEvent.clientX - containerRef.current.getBoundingClientRect().left
      setLeftWidth(Math.max(140, Math.min(width, 420)))
    }
    const handleMouseUp = () => {
      isDraggingRef.current = false
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [])
  return { leftWidth, containerRef, handleMouseDown }
}

function getFocusedAnswerOptionClass(isFocused: boolean) {
  return isFocused ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold ring-1 ring-blue-500/40' : ''
}

function getSelectedAnswerOptionClass(isSelected: boolean) {
  return isSelected ? 'text-blue-600 dark:text-blue-400 font-bold' : ''
}

function getDefaultAnswerOptionClass(isSelected: boolean, isFocused: boolean) {
  return !isSelected && !isFocused ? 'text-foreground hover:text-blue-500' : ''
}

function getDisabledAnswerOptionClass(isDisabled: boolean) {
  return isDisabled ? 'cursor-not-allowed' : ''
}

function getStandardAnswerOptionClassName(isFocused: boolean, isSelected: boolean, isDisabled: boolean) {
  return cn(
    'flex items-center gap-1.5 py-0.5 px-2 text-xs font-semibold cursor-pointer transition-none select-none rounded w-24 justify-start',
    getFocusedAnswerOptionClass(isFocused),
    getSelectedAnswerOptionClass(isSelected),
    getDefaultAnswerOptionClass(isSelected, isFocused),
    getDisabledAnswerOptionClass(isDisabled)
  )
}

function StandardAnswerOption({ question, index, isSingleAnswer, isSelected, isFocused, isDisabled, onSelectOption }: {
  question: SessionQuestion
  index: number
  isSingleAnswer: boolean
  isSelected: boolean
  isFocused: boolean
  isDisabled: boolean
  onSelectOption: (index: number) => void
}) {
  return (
    <label className={getStandardAnswerOptionClassName(isFocused, isSelected, isDisabled)}>
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        {isFocused && <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
      </span>
      <input
        type={isSingleAnswer ? 'radio' : 'checkbox'}
        name={isSingleAnswer ? `question-${question._id}-answer` : undefined}
        checked={isSelected}
        disabled={isDisabled}
        onChange={() => onSelectOption(index)}
        className="w-4 h-4 rounded-xs text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer shrink-0"
      />
      <span>{String.fromCharCode(65 + index)}</span>
    </label>
  )
}

function StandardAnswerNavigation({ currentIndex, totalQuestions, navigationDisabled, onNavigate }: Pick<QuestionDisplayProps, 'currentIndex' | 'totalQuestions' | 'navigationDisabled' | 'onNavigate'>) {
  return (
    <div className="mt-4 flex items-center justify-center gap-1.5">
      <button type="button" onClick={() => onNavigate?.(currentIndex - 1)} disabled={navigationDisabled || currentIndex === 0} className="px-2.5 py-1 rounded border border-border bg-card text-[11px] font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-none shadow-2xs">Back</button>
      <button type="button" onClick={() => onNavigate?.(currentIndex + 1)} disabled={navigationDisabled || currentIndex === totalQuestions - 1} className="px-2.5 py-1 rounded border border-border bg-card text-[11px] font-medium text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-none shadow-2xs">Next</button>
    </div>
  )
}

function StandardAnswerOptions({ question, selectedOptions, focusedOption, isSingleAnswer, isDisabled, onSelectOption }: Pick<QuestionDisplayProps, 'question' | 'selectedOptions' | 'focusedOption' | 'onSelectOption'> & { isSingleAnswer: boolean; isDisabled: boolean }) {
  return (
    <div role={isSingleAnswer ? 'radiogroup' : 'group'} aria-label={isSingleAnswer ? 'Choose one answer' : 'Choose all correct answers'} className="space-y-3 flex flex-col items-center justify-start pt-2">
      {question.options.map((_, index) => (
        <StandardAnswerOption
          key={index} question={question} index={index} isSingleAnswer={isSingleAnswer}
          isSelected={selectedOptions.includes(index)} isFocused={focusedOption === index}
          isDisabled={isDisabled} onSelectOption={onSelectOption}
        />
      ))}
    </div>
  )
}

function StandardAnswerPanel({ question, selectedOptions, focusedOption, showImmediateFeedback, sessionMode, submitted, isSingleAnswer, currentIndex, totalQuestions, navigationDisabled, onNavigate, onSelectOption, leftWidth }: {
  question: SessionQuestion
  selectedOptions: number[]
  focusedOption?: number | null
  showImmediateFeedback: boolean
  sessionMode: QuestionDisplayProps['sessionMode']
  submitted: boolean
  isSingleAnswer: boolean
  currentIndex: number
  totalQuestions: number
  navigationDisabled?: boolean
  onNavigate?: (index: number) => void
  onSelectOption: (index: number) => void
  leftWidth: number
}) {
  const isDisabled = showImmediateFeedback || (sessionMode === 'review' && submitted)
  return (
    <div style={{ width: `${leftWidth}px` }} className="shrink-0 h-full flex flex-col p-3 border-r border-border bg-muted/20 overflow-y-auto">
      <h3 className="text-sm font-bold text-center text-blue-800 dark:text-blue-400 mb-3">Answer</h3>
      <StandardAnswerOptions question={question} selectedOptions={selectedOptions} focusedOption={focusedOption} isSingleAnswer={isSingleAnswer} isDisabled={isDisabled} onSelectOption={onSelectOption} />
      <StandardAnswerNavigation currentIndex={currentIndex} totalQuestions={totalQuestions} navigationDisabled={navigationDisabled} onNavigate={onNavigate} />
    </div>
  )
}

function getStandardOptionStatus(isCorrect: boolean, isWrongSelected: boolean, isSelected: boolean) {
  if (isCorrect) return 'border-success-border bg-success-bg text-success-fg font-medium ring-1 ring-success-border shadow-xs'
  if (isWrongSelected) return 'border-incorrect-border bg-incorrect-bg text-incorrect-fg font-medium ring-1 ring-incorrect-border shadow-xs'
  if (isSelected) return 'border-primary bg-primary/10 text-primary font-normal'
  return 'border-transparent text-foreground hover:bg-muted/50'
}

function getStandardOptionInteraction(isDisabled: boolean, isNoteActive: boolean) {
  if (isNoteActive) return 'cursor-text border-dashed border-amber-500/40 bg-amber-500/5'
  return isDisabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
}

function StandardOptionFeedback({ isCorrect, isWrongSelected }: { isCorrect: boolean; isWrongSelected: boolean }) {
  if (isCorrect) return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-success-fg bg-background/90 px-2 py-0.5 rounded border border-success-border shrink-0 animate-in fade-in duration-200"><CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5" /> Correct answer</span>
  if (isWrongSelected) return <span className="inline-flex items-center gap-1 text-[11px] font-bold text-incorrect-fg bg-background/90 px-2 py-0.5 rounded border border-incorrect-border shrink-0 animate-in fade-in duration-200"><XCircle aria-hidden="true" className="w-3.5 h-3.5" /> Your answer is incorrect</span>
  return null
}

function getStandardOptionAnswerState(index: number, props: Pick<QuestionDisplayProps, 'selectedOptions' | 'showImmediateFeedback'> & { correctAnswerSet: number[] }) {
  const isSelected = props.selectedOptions.includes(index)
  const isCorrect = Boolean(props.showImmediateFeedback && props.correctAnswerSet.includes(index))
  const isWrongSelected = Boolean(props.showImmediateFeedback && isSelected && !props.correctAnswerSet.includes(index))
  return { isSelected, isCorrect, isWrongSelected }
}

function getStandardOptionState(index: number, props: Pick<QuestionDisplayProps, 'selectedOptions' | 'showImmediateFeedback' | 'submitted' | 'isPending' | 'isNoteMode'> & { correctAnswerSet: number[] }) {
  return {
    ...getStandardOptionAnswerState(index, props),
    isDisabled: props.submitted || props.isPending,
    isNoteActive: Boolean(props.isNoteMode),
  }
}

function handleStandardOptionClick(isDisabled: boolean, isNoteActive: boolean, index: number, onSelectOption: (index: number) => void) {
  if (isDisabled || isNoteActive) return
  onSelectOption(index)
}

function isFirstUnselectedOption(selectedCount: number, index: number) {
  return selectedCount === 0 && index === 0
}

function getSingleAnswerTabIndex(isSelected: boolean, selectedCount: number, index: number) {
  return isSelected || isFirstUnselectedOption(selectedCount, index) ? 0 : -1
}

function getOptionTabIndex(isSingleAnswer: boolean, isSelected: boolean, selectedCount: number, index: number) {
  return isSingleAnswer ? getSingleAnswerTabIndex(isSelected, selectedCount, index) : undefined
}

function StandardOptionMarker({ letter, isCorrect, isWrongSelected }: { letter: string; isCorrect: boolean; isWrongSelected: boolean }) {
  return (
    <span className={cn('inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold shrink-0', isCorrect ? 'bg-success-fg text-white' : isWrongSelected ? 'bg-incorrect-border text-white' : 'font-normal')}>
      {letter}.
    </span>
  )
}

function StandardOption({ question, index, isSingleAnswer, selectedOptions, showImmediateFeedback, correctAnswerSet, submitted, isPending, isNoteMode, onSelectOption }: Pick<QuestionDisplayProps, 'question' | 'selectedOptions' | 'showImmediateFeedback' | 'submitted' | 'isPending' | 'isNoteMode' | 'onSelectOption'> & { index: number; isSingleAnswer: boolean; correctAnswerSet: number[] }) {
  const { isSelected, isCorrect, isWrongSelected, isDisabled, isNoteActive } = getStandardOptionState(index, { selectedOptions, showImmediateFeedback, correctAnswerSet, submitted, isPending, isNoteMode })
  const letter = String.fromCodePoint(65 + index)
  return (
    <button
      key={index}
      type="button"
      role={isSingleAnswer ? 'radio' : 'checkbox'}
      aria-checked={isSelected}
      tabIndex={getOptionTabIndex(isSingleAnswer, isSelected, selectedOptions.length, index)}
      aria-label={`Option ${letter}: ${question.options[index]}`}
      onKeyDown={isSingleAnswer ? (event) => handleStandardOptionArrowKeyDown(event, index, question.options.length, onSelectOption) : undefined}
      disabled={isDisabled}
      onClick={() => handleStandardOptionClick(isDisabled, isNoteActive, index, onSelectOption)}
      className={cn('w-full text-left p-2.5 rounded text-sm font-normal leading-relaxed question-option-font transition-none border flex items-center justify-between gap-3', getStandardOptionInteraction(isDisabled, isNoteActive), getStandardOptionStatus(isCorrect, isWrongSelected, isSelected))}
    >
      <div className="flex items-center gap-2 flex-1">
        <StandardOptionMarker letter={letter} isCorrect={isCorrect} isWrongSelected={isWrongSelected} />
        <span><InteractiveText content={question.options[index]} sourceType="quiz" sourceId={question._id} /></span>
      </div>
      <StandardOptionFeedback isCorrect={isCorrect} isWrongSelected={isWrongSelected} />
    </button>
  )
}

function StandardQuestionHeader({ question, safeDisplayIndex, totalQuestions, requiredSelectionCount, isPinned, togglePinMutation, handleTogglePin, courseCode }: {
  question: SessionQuestion
  safeDisplayIndex: number
  totalQuestions: number
  requiredSelectionCount: number
  isPinned: boolean
  togglePinMutation: ReturnType<typeof usePinnedQuestions>['togglePinMutation']
  handleTogglePin: () => void
  courseCode?: string
}) {
  return (
    <div className="flex items-center justify-start gap-3 flex-wrap pb-2 border-b border-border w-full">
      <span className="text-xs font-bold text-foreground">Question {safeDisplayIndex}/{totalQuestions}</span>
      <span className="text-[11px] text-muted-foreground italic">{requiredSelectionCount === 1 ? '(Choose 1 answer)' : `(Choose ${requiredSelectionCount} answers)`}</span>
      <button type="button" onClick={handleTogglePin} disabled={togglePinMutation.isPending} className="text-xs text-muted-foreground hover:text-foreground font-medium underline">{isPinned ? 'Unpin' : 'Pin question'}</button>
      <UsageBadge count={question.usage_count} used_in_quizzes={question.used_in_quizzes} currentCourseCode={courseCode} />
    </div>
  )
}

function StandardQuestionPane({ props, requiredSelectionCount, safeDisplayIndex, isPinned, togglePinMutation, handleTogglePin, isSingleAnswer, correctAnswerSet }: {
  props: QuestionDisplayProps
  requiredSelectionCount: number
  safeDisplayIndex: number
  isPinned: boolean
  togglePinMutation: ReturnType<typeof usePinnedQuestions>['togglePinMutation']
  handleTogglePin: () => void
  isSingleAnswer: boolean
  correctAnswerSet: number[]
}) {
  const { question, totalQuestions, courseCode } = props
  return (
    <div className="flex-1 min-w-0 h-full overflow-y-auto p-4 sm:p-6 space-y-4">
      <StandardQuestionHeader question={question} safeDisplayIndex={safeDisplayIndex} totalQuestions={totalQuestions} requiredSelectionCount={requiredSelectionCount} isPinned={isPinned} togglePinMutation={togglePinMutation} handleTogglePin={handleTogglePin} courseCode={courseCode} />
      <div className="max-w-3xl w-full space-y-4">
        <p className="whitespace-pre-wrap text-sm sm:text-base font-normal leading-relaxed text-foreground question-option-font"><InteractiveText content={question.text} sourceType="quiz" sourceId={question._id} /></p>
        {question.image_url && <div className="my-3 border border-border bg-muted/20 p-2 rounded"><img src={question.image_url} alt="Question illustration" className="max-h-[360px] w-auto object-contain" /></div>}
        <div role={isSingleAnswer ? 'radiogroup' : 'group'} aria-label={isSingleAnswer ? 'Choose one answer' : 'Choose all correct answers'} className="space-y-2.5 pt-2">
          {question.options.map((_, index) => <StandardOption key={index} question={question} index={index} isSingleAnswer={isSingleAnswer} selectedOptions={props.selectedOptions} showImmediateFeedback={props.showImmediateFeedback} correctAnswerSet={correctAnswerSet} submitted={props.submitted} isPending={props.isPending} isNoteMode={props.isNoteMode} onSelectOption={props.onSelectOption} />)}
        </div>
      </div>
    </div>
  )
}

function StandardExamFooter({ wantFinish, setWantFinish, onSubmit, submitDisabled, isPending, onExit }: Pick<QuestionDisplayProps, 'onSubmit' | 'submitDisabled' | 'isPending' | 'onExit'> & { wantFinish: boolean; setWantFinish: (value: boolean) => void }) {
  return (
    <div className="shrink-0 border-t border-border px-4 py-2 bg-card text-foreground font-sans text-xs flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none"><input type="checkbox" checked={wantFinish} onChange={(event) => setWantFinish(event.target.checked)} className="w-3.5 h-3.5 rounded-xs accent-blue-600 cursor-pointer" /><span>I want to finish the exam.</span></label>
        <button type="button" onClick={onSubmit} disabled={!wantFinish || isPending || submitDisabled} className="px-3 py-1 rounded border border-border bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-none">Finish Exam</button>
      </div>
      {onExit && <button type="button" onClick={onExit} className="px-3 py-1 rounded border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-none">Exit</button>}
    </div>
  )
}

function StandardQuestionView(props: QuestionDisplayProps) {
  const [wantFinish, setWantFinish] = React.useState(false)
  const { leftWidth, containerRef, handleMouseDown } = useResizableQuestionPanel()
  const state = useQuestionDisplayState(props)
  return (
    <div ref={containerRef} className="flex flex-col h-full w-full overflow-hidden bg-background text-foreground question-option-font">
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        <StandardAnswerPanel question={props.question} selectedOptions={props.selectedOptions} focusedOption={props.focusedOption} showImmediateFeedback={props.showImmediateFeedback} sessionMode={props.sessionMode} submitted={props.submitted} isSingleAnswer={state.isSingleAnswer} currentIndex={props.currentIndex} totalQuestions={props.totalQuestions} navigationDisabled={props.navigationDisabled} onNavigate={props.onNavigate} onSelectOption={props.onSelectOption} leftWidth={leftWidth} />
        <div onMouseDown={handleMouseDown} className="w-1.5 shrink-0 h-full bg-red-600 hover:bg-red-500 cursor-col-resize select-none transition-colors" title="Drag to resize columns" />
        <StandardQuestionPane props={props} requiredSelectionCount={state.requiredSelectionCount} safeDisplayIndex={state.safeDisplayIndex} isPinned={state.isPinned} togglePinMutation={state.togglePinMutation} handleTogglePin={state.handleTogglePin} isSingleAnswer={state.isSingleAnswer} correctAnswerSet={state.correctAnswerSet} />
      </div>
      <StandardExamFooter wantFinish={wantFinish} setWantFinish={setWantFinish} onSubmit={props.onSubmit} submitDisabled={props.submitDisabled} isPending={props.isPending} onExit={props.onExit} />
    </div>
  )
}

/**
 * Animated / Modern View (enableAnimation = true)
 * - Question Card & Options centered vertically and horizontally in workspace (Image 2 style)
 * - GSAP staggered entrance animations upon question change
 * - Rich option cards, hover micro-interactions, feedback badges
 */
type AnimatedOptionState = {
  isSelected: boolean
  isCorrect: boolean
  isWrongSelected: boolean
  isFocused: boolean
  isAnswerDisabled: boolean
  isNoteActive: boolean
}

function getAnimatedOptionAnswerState(index: number, props: Pick<QuestionDisplayProps, 'selectedOptions' | 'showImmediateFeedback'> & { correctAnswerSet: number[] }) {
  const isSelected = props.selectedOptions.includes(index)
  const isCorrect = Boolean(props.showImmediateFeedback && props.correctAnswerSet.includes(index))
  return {
    isSelected,
    isCorrect,
    isWrongSelected: Boolean(props.showImmediateFeedback && isSelected && !props.correctAnswerSet.includes(index)),
  }
}

function getAnimatedOptionState(index: number, props: Pick<QuestionDisplayProps, 'selectedOptions' | 'showImmediateFeedback' | 'focusedOption' | 'sessionMode' | 'submitted' | 'isNoteMode'> & { correctAnswerSet: number[] }): AnimatedOptionState {
  return {
    ...getAnimatedOptionAnswerState(index, props),
    isFocused: props.focusedOption === index,
    isAnswerDisabled: props.showImmediateFeedback || (props.sessionMode === 'review' && props.submitted),
    isNoteActive: Boolean(props.isNoteMode),
  }
}

function getAnimatedDisabledClass(isAnswerDisabled: boolean) {
  return isAnswerDisabled ? 'cursor-not-allowed opacity-90' : ''
}

function getAnimatedEnabledClass(isAnswerDisabled: boolean, isNoteActive: boolean) {
  return !isAnswerDisabled && !isNoteActive ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0' : ''
}

function getAnimatedNoteClass(isNoteActive: boolean) {
  return isNoteActive ? 'cursor-text border-dashed border-amber-500/40 bg-amber-500/5' : ''
}

function getAnimatedFocusedClass(isFocused: boolean) {
  return isFocused ? 'ring-2 ring-primary ring-offset-2 ring-offset-background border-primary shadow-md' : ''
}

function getAnimatedOptionInteractionClasses(state: AnimatedOptionState) {
  return cn(
    getAnimatedDisabledClass(state.isAnswerDisabled),
    getAnimatedEnabledClass(state.isAnswerDisabled, state.isNoteActive),
    getAnimatedNoteClass(state.isNoteActive),
    getAnimatedFocusedClass(state.isFocused)
  )
}

function getAnimatedOptionCorrectnessClasses(state: AnimatedOptionState) {
  if (state.isCorrect) return 'border-success-border bg-success-bg text-success-fg font-semibold shadow-xs ring-2 ring-success-border/30 animate-in zoom-in-95 duration-200'
  if (state.isWrongSelected) return 'border-incorrect-border bg-incorrect-bg text-incorrect-fg font-semibold shadow-xs ring-2 ring-incorrect-border/30 animate-in shake duration-200'
  return ''
}

function getAnimatedOptionUnselectedClasses(isNoteActive: boolean) {
  return isNoteActive ? '' : 'border-border bg-card/80 text-foreground hover:border-primary/50 hover:bg-muted/60'
}

function getAnimatedOptionAnswerClasses(state: AnimatedOptionState) {
  const correctnessClasses = getAnimatedOptionCorrectnessClasses(state)
  if (correctnessClasses) return correctnessClasses
  if (state.isSelected) return 'border-primary bg-primary/10 font-semibold text-primary shadow-sm ring-2 ring-primary/20'
  return getAnimatedOptionUnselectedClasses(state.isNoteActive)
}

function getAnimatedOptionMarkerClasses(state: AnimatedOptionState) {
  if (state.isCorrect) return 'bg-success-fg text-white shadow-sm'
  if (state.isWrongSelected) return 'bg-incorrect-border text-white shadow-sm'
  if (state.isSelected) return 'bg-primary text-primary-foreground shadow-sm'
  return 'bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
}

function AnimatedOptionFeedback({ isCorrect, isWrongSelected }: Pick<AnimatedOptionState, 'isCorrect' | 'isWrongSelected'>) {
  if (isCorrect) return <span className="inline-flex items-center gap-1 text-xs font-bold text-success-fg bg-background/90 px-2.5 py-1 rounded-md border border-success-border shrink-0 animate-in zoom-in duration-300 shadow-xs"><CheckCircle2 aria-hidden="true" className="w-4 h-4" /> Correct answer</span>
  if (isWrongSelected) return <span className="inline-flex items-center gap-1 text-xs font-bold text-incorrect-fg bg-background/90 px-2.5 py-1 rounded-md border border-incorrect-border shrink-0 animate-in zoom-in duration-300 shadow-xs"><XCircle aria-hidden="true" className="w-4 h-4" /> Your answer is incorrect</span>
  return null
}

function AnimatedQuestionOption({ question, option, index, selectedOptions, isSingleAnswer, showImmediateFeedback, correctAnswerSet, focusedOption, sessionMode, submitted, isNoteMode, onSelectOption }: Pick<QuestionDisplayProps, 'question' | 'selectedOptions' | 'showImmediateFeedback' | 'focusedOption' | 'sessionMode' | 'submitted' | 'isNoteMode' | 'onSelectOption'> & { option: string; index: number; isSingleAnswer: boolean; correctAnswerSet: number[] }) {
  const state = getAnimatedOptionState(index, { selectedOptions, showImmediateFeedback, correctAnswerSet, focusedOption, sessionMode, submitted, isNoteMode })
  const letter = String.fromCodePoint(65 + index)
  const handleClick = () => handleStandardOptionClick(state.isAnswerDisabled, state.isNoteActive, index, onSelectOption)
  return (
    <button
      key={`${index}-${option}`}
      type="button"
      role={isSingleAnswer ? 'radio' : 'checkbox'}
      aria-checked={state.isSelected}
      tabIndex={getOptionTabIndex(isSingleAnswer, state.isSelected, selectedOptions.length, index)}
      aria-label={`Option ${letter}: ${option}`}
      onKeyDown={isSingleAnswer ? (event) => handleStandardOptionArrowKeyDown(event, index, question.options.length, onSelectOption) : undefined}
      onClick={handleClick}
      disabled={state.isAnswerDisabled}
      className={cn('option-card w-full min-h-question-option py-2.5 px-4 text-left text-sm sm:text-base leading-relaxed transition-all duration-200 rounded-xl border-2 flex items-center gap-3.5 relative overflow-hidden group shadow-2xs', getAnimatedOptionInteractionClasses(state), getAnimatedOptionAnswerClasses(state))}
    >
      <span className={cn('flex-none flex items-center justify-center w-7 h-7 rounded-lg font-extrabold text-xs transition-colors duration-200 shrink-0', getAnimatedOptionMarkerClasses(state))}>
        {letter}
      </span>
      <span className="flex-1 whitespace-pre-wrap">
        <InteractiveText content={option} sourceType="quiz" sourceId={question._id} />
      </span>
      <AnimatedOptionFeedback isCorrect={state.isCorrect} isWrongSelected={state.isWrongSelected} />
    </button>
  )
}

function AnimatedQuestionView({
  question,
  currentIndex,
  totalQuestions,
  selectedOptions,
  submitted,
  showImmediateFeedback,
  lastAnswerResult,
  onSelectOption,
  isPending,
  courseCode,
  quizTitle,
  quizId,
  focusedOption,
  isNoteMode,
  sessionMode,
}: QuestionDisplayProps) {
  const { requiredSelectionCount, isSingleAnswer, correctAnswerSet, safeDisplayIndex, isPinned, togglePinMutation, handleTogglePin } = useQuestionDisplayState({
    question, currentIndex, totalQuestions, showImmediateFeedback, lastAnswerResult, courseCode, quizTitle, quizId,
  })

  return (
    <div className="question-view-animated flex h-full w-full flex-col items-start justify-start quiz-scroll overflow-y-auto p-4 sm:p-6 sm:pt-8 md:pt-10 pb-12">
      <div className="question-card-inner shrink-0 max-w-3xl w-full border border-border bg-card/95 backdrop-blur-md p-5 sm:p-7 rounded-2xl shadow-lg transition-all duration-300 mb-10">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20 shadow-2xs">
              Question {safeDisplayIndex}/{totalQuestions}
            </span>
            <span className="text-xs text-muted-foreground italic font-medium">
              {requiredSelectionCount === 1 ? '(Choose 1 answer)' : `(Choose ${requiredSelectionCount} answers)`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <UsageBadge
              count={question.usage_count}
              used_in_quizzes={question.used_in_quizzes}
              currentCourseCode={courseCode}
            />
            <button
              type="button"
              onClick={handleTogglePin}
              disabled={togglePinMutation.isPending}
              className={cn(
                "flex items-center gap-1.5 border px-2.5 py-1 text-xs font-semibold cursor-pointer rounded-lg transition-all active:scale-95",
                isPinned
                  ? "border-amber-400/50 bg-amber-500/10 text-amber-500 shadow-2xs"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Bookmark aria-hidden="true" className={cn("w-3.5 h-3.5 transition-transform", isPinned && "fill-current scale-110")} />
              <span>{isPinned ? 'Pinned' : 'Pin question'}</span>
            </button>
          </div>
        </div>

        {/* Note Mode Banner Alert */}
        {isNoteMode && (
          <div className="mb-4 flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold animate-in fade-in zoom-in-95 duration-200">
            <span className="flex items-center gap-2">
              <PenTool aria-hidden="true" className="w-4 h-4 text-amber-500 animate-bounce" />
              <span>Vocabulary Lookup Mode is active: Highlight text to look up definitions (option selection is paused).</span>
            </span>
          </div>
        )}

        <p className="question-text-animated whitespace-pre-wrap text-base sm:text-lg font-normal leading-relaxed text-foreground tracking-tight">
          <InteractiveText content={question.text} sourceType="quiz" sourceId={question._id} />
        </p>

        {question.image_url && (
          <div className="mt-4 border border-border bg-muted/30 p-2 rounded-xl">
            <div className="flex min-h-[220px] max-h-question-image w-full items-center justify-center overflow-hidden rounded-lg bg-background">
              <img
                src={question.image_url}
                alt="Question illustration"
                className="h-full max-h-question-image w-full object-contain transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </div>
        )}

        <div
          role={isSingleAnswer ? 'radiogroup' : 'group'}
          aria-label={isSingleAnswer ? 'Choose one answer' : 'Choose all correct answers'}
          className="mt-6 space-y-3"
        >
          {question.options.map((option, index) => (
            <AnimatedQuestionOption
              key={`${index}-${option}`}
              question={question}
              option={option}
              index={index}
              selectedOptions={selectedOptions}
              isSingleAnswer={isSingleAnswer}
              showImmediateFeedback={showImmediateFeedback}
              correctAnswerSet={correctAnswerSet}
              focusedOption={focusedOption}
              sessionMode={sessionMode}
              submitted={submitted}
              isNoteMode={isNoteMode}
              onSelectOption={onSelectOption}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function getAnswerAnnouncement(props: QuestionDisplayProps) {
  if (!props.showImmediateFeedback || !props.lastAnswerResult) return ''
  const status = props.lastAnswerResult.isCorrect ? 'Correct' : 'Incorrect'
  return `Question ${props.currentIndex + 1}: ${status}.`
}

function QuestionDisplayContent(props: QuestionDisplayProps) {
  if (!props.question || !Array.isArray(props.question.options)) {
    return <div className="flex h-full items-center justify-center p-6 text-muted-foreground font-medium">Preparing question...</div>
  }
  return props.enableAnimation ? <AnimatedQuestionView {...props} /> : <StandardQuestionView {...props} />
}

export const QuestionDisplay = React.memo(function QuestionDisplay(props: QuestionDisplayProps) {
  const answerAnnouncement = getAnswerAnnouncement(props)
  return (
    <>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {answerAnnouncement}
      </div>
      <QuestionDisplayContent {...props} />
    </>
  )
})

