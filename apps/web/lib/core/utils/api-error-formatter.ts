import { useToast, type ToastOptions, type ToastType } from '@/store/shared/toast-store'

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
  fallbackMessage: string = 'An unexpected error occurred. Please try again later.'
): FormattedError {
  if (!error) {
    return {
      title: 'Error',
      message: fallbackMessage,
      type: 'error',
    }
  }

  // Network / Offline errors
  if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
    return {
      title: 'Connection Lost',
      message: 'Unable to connect to the server. Please check your internet connection or reload the page.',
      type: 'error',
    }
  }

  if ((error as any)?.name === 'AbortError') {
    return {
      title: 'Request Timed Out',
      message: 'The request took too long to complete. The server may be busy, please try again.',
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
      title: 'Invalid Request',
      message: typeof serverMsg === 'string' && serverMsg ? serverMsg : 'The request payload is invalid or malformed.',
      type: 'error',
    }
  }

  if (status === 401) {
    return {
      status,
      title: 'Session Expired',
      message: typeof serverMsg === 'string' && serverMsg ? serverMsg : 'Your login session has expired. Please log in again.',
      type: 'warning',
    }
  }

  if (status === 403) {
    return {
      status,
      title: 'Access Denied',
      message: typeof serverMsg === 'string' && serverMsg ? serverMsg : 'You do not have permission to perform this action.',
      type: 'error',
    }
  }

  if (status === 404) {
    return {
      status,
      title: 'Not Found',
      message: typeof serverMsg === 'string' && serverMsg ? serverMsg : 'The requested resource or page was not found.',
      type: 'info',
    }
  }

  if (status === 429) {
    return {
      status,
      title: 'Too Many Requests',
      message: typeof serverMsg === 'string' && serverMsg ? serverMsg : 'You are sending too many requests. Please wait a moment and try again.',
      type: 'warning',
    }
  }

  if (status === 500) {
    return {
      status,
      title: 'Internal Server Error',
      message: typeof serverMsg === 'string' && serverMsg && !serverMsg.includes('Internal Server Error')
        ? serverMsg
        : 'The server encountered an error processing your request. Please try again shortly.',
      type: 'error',
    }
  }

  if (status === 502 || status === 503 || status === 504) {
    return {
      status,
      title: 'Service Unavailable',
      message: 'The service is temporarily unavailable or undergoing maintenance. Your data is safe, please try again shortly.',
      type: 'error',
    }
  }

  // Fallback for standard string/Error messages
  if (typeof serverMsg === 'string' && serverMsg.trim()) {
    return {
      title: 'Notice',
      message: serverMsg,
      type: 'error',
    }
  }

  return {
    title: 'System Error',
    message: fallbackMessage,
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
