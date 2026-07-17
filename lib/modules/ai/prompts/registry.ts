import {
  vocabularyGeneration,
  sentenceGeneration,
  paragraphGeneration,
  grammarGeneration,
  quizGeneration,
  flashcardGeneration,
  translation,
  dialogueGeneration,
  storyGeneration,
} from './index'

export const promptRegistry = {
  vocabulary: vocabularyGeneration,
  sentence: sentenceGeneration,
  paragraph: paragraphGeneration,
  grammar: grammarGeneration,
  quiz: quizGeneration,
  flashcard: flashcardGeneration,
  translation,
  dialogue: dialogueGeneration,
  story: storyGeneration,
} as const

export type PromptType = keyof typeof promptRegistry
