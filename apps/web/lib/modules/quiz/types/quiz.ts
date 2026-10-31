import type { Types } from 'mongoose'
import type { IQuestion as SharedQuestion, IQuiz as SharedQuiz } from '@fquiz/models'

export type { IQuestionStandalone, ICategory, QuestionForm, QuizFormData } from '@fquiz/models'

/** Embedded quiz questions always have an identifier in the web application. */
export interface IQuestion extends SharedQuestion {
  _id: Types.ObjectId
}

/** Keep the editor's serialized mix configuration while sharing stored quiz fields. */
export interface IQuiz extends Omit<SharedQuiz, 'questions' | 'mix_config'> {
  questions: IQuestion[]
  mix_config?: {
    quiz_ids: string[]
    question_count: number
    mode: 'immediate' | 'review'
    category_id: string
  }
}

/** Basic category data for UI select/list. */
export type { ICategoryItem as Category } from '@fquiz/models'
