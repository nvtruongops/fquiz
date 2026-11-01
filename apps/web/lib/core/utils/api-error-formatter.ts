import { useToast, type ToastOptions, type ToastType } from '@/store/shared/toast-store'
import { getStoredLocale, translateMessage } from '@fquiz/ui/i18n'

export interface FormattedError {
  message: string
  title: string
  type: ToastType
  status?: number
}

/**
 * Format any API / network / server error into a user-friendly Vietnamese message
 */
export function formatApiError(
  error: unknown,
  fallbackMessage?: string
): FormattedError {
  const locale = getStoredLocale()
  const t = (key: Parameters<typeof translateMessage>[1]) => translateMessage(locale, key)
  const defaultMessage = fallbackMessage ?? t('notification.unexpectedError')
  if (!error) {
    return {
      title: t('notification.error'),
      message: defaultMessage,
      type: 'error',
    }
  }

  // Network / Offline errors
  if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
    return {
      title: t('notification.connectionLost'),
      message: t('notification.connectionLostDescription'),
      type: 'error',
    }
  }

  if ((error as any)?.name === 'AbortError') {
    return {
      title: t('notification.requestTimedOut'),
      message: t('notification.requestTimedOutDescription'),
      type: 'warning',
    }
  }

  // Extract HTTP status code if available
  const status =
    (error as any)?.status ||
    (error as any)?.statusCode ||
    (error as any)?.response?.status

  // Extract server message
  const serverMsg =
    (error as any)?.data?.message ||
    (error as any)?.data?.error ||
    (error as any)?.error ||
    (error as any)?.message

  // Categorize by status code
  if (status === 400) {
    return {
      status,
      title: t('notification.invalidRequest'),
      message: t('notification.invalidRequestDescription'),
      type: 'error',
    }
  }

  if (status === 401) {
    return {
      status,
      title: t('notification.sessionExpired'),
      message: t('notification.sessionExpiredDescription'),
      type: 'warning',
    }
  }

  if (status === 403) {
    return {
      status,
      title: t('notification.accessDenied'),
      message: t('notification.accessDeniedDescription'),
      type: 'error',
    }
  }

  if (status === 404) {
    return {
      status,
      title: t('notification.notFound'),
      message: t('notification.notFoundDescription'),
      type: 'info',
    }
  }

  if (status === 429) {
    return {
      status,
      title: t('notification.tooManyRequests'),
      message: t('notification.tooManyRequestsDescription'),
      type: 'warning',
    }
  }

  if (status === 500) {
    return {
      status,
      title: t('notification.serverError'),
      message: t('notification.serverErrorDescription'),
      type: 'error',
    }
  }

  if (status === 502 || status === 503 || status === 504) {
    return {
      status,
      title: t('notification.serviceUnavailable'),
      message: t('notification.serviceUnavailableDescription'),
      type: 'error',
    }
  }

  // Fallback for standard string/Error messages
  if (typeof serverMsg === 'string' && serverMsg.trim()) {
    return {
      title: t('notification.notice'),
      message: defaultMessage,
      type: 'error',
    }
  }

  return {
    title: t('notification.systemError'),
    message: defaultMessage,
    type: 'error',
  }
}

/**
 * Convenience helper to show formatted API / Server errors in Toast UI
 */
export function notifyApiError(
  error: unknown,
  fallbackMessage?: string,
  options?: ToastOptions
): string {
  const formatted = formatApiError(error, fallbackMessage)
  const toastMethod =
    formatted.type === 'warning'
      ? useToast.getState().toast.warning
      : formatted.type === 'info'
      ? useToast.getState().toast.info
      : useToast.getState().toast.error

  return toastMethod(formatted.message, {
    title: options?.title || formatted.title,
    duration: options?.duration,
    action: options?.action,
  })
}
