export function isSessionQuestionReady({
  isInitialLoading,
  isReadyToRender,
  sessionStatus,
}: {
  isInitialLoading: boolean
  isReadyToRender: boolean
  sessionStatus: string | undefined
}): boolean {
  return !isInitialLoading && isReadyToRender && sessionStatus !== undefined && sessionStatus !== 'preparing'
}

export function isQuestionNavigationReady(
  preloadedCount: number | null | undefined,
  totalQuestions: number,
): boolean {
  return totalQuestions > 0 && (totalQuestions === 1 || (preloadedCount ?? 0) >= totalQuestions)
}

export function shouldShowSessionSkeleton(
  isLoading: boolean,
  sessionLoaderOpen: boolean,
  transitionLoaderActive: boolean,
): boolean {
  return isLoading && !sessionLoaderOpen && !transitionLoaderActive
}
