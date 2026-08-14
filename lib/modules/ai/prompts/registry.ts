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
  writingGeneration,
  writingEvaluation,
  quizAssistantPrompt,
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
  writing: writingGeneration,
  writing_eval: writingEvaluation,
  quiz_assistant: quizAssistantPrompt,
} as const

export type PromptType = keyof typeof promptRegistry
