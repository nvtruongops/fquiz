import { registerModel } from '@fquiz/database'

export * from './User'
export * from './EmailVerification'
export * from './LoginLog'
export * from './SiteSettings'
export * from './Feedback'
export * from './Category'
export * from './Question'
export * from './QuestionBank'
export * from './Quiz'
export * from './QuizComment'
export * from './PinnedQuestion'
export * from './MigrationLog'
export * from './QuizSession'
export * from './Classroom'
export * from './ClassroomMember'
export * from './QuizAssignment'
export * from './QuizAssignmentProgress'
export * from './Post'
export * from './AIAsset'
export * from './AILearningLog'

// Auto-register all models with ModelRegistry to avoid MissingSchemaError
registerModel(async () => {
  await import('./User')
  await import('./EmailVerification')
  await import('./LoginLog')
  await import('./SiteSettings')
  await import('./Feedback')
  await import('./Category')
  await import('./Question')
  await import('./QuestionBank')
  await import('./Quiz')
  await import('./QuizComment')
  await import('./PinnedQuestion')
  await import('./MigrationLog')
  await import('./QuizSession')
  await import('./Classroom')
  await import('./ClassroomMember')
  await import('./QuizAssignment')
  await import('./QuizAssignmentProgress')
  await import('./Post')
  await import('./AIAsset')
  await import('./AILearningLog')
})
