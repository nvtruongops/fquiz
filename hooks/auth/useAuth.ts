'use client'

import { useQuery } from '@tanstack/react-query'
import { API_ROUTES } from '@/lib/core/constants/api-routes'

export interface AuthUser {
  _id?: string
  name: string
  email?: string
  role: string
  avatarUrl?: string
}

export interface AuthResponse {
  user: AuthUser | null
  banned?: boolean
}

export function useAuth(initialData?: AuthResponse) {
  return useQuery<AuthResponse, Error>({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}${API_ROUTES.AUTH.ME}`, {
        credentials: 'include',
      })
      
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}))
        if (data.banned) {
          // If user is banned, redirect to login page immediately
          globalThis.location.href = '/login?reason=account_banned'
          throw new Error('Account banned')
        }
      }

      if (!res.ok) {
        throw new Error('Failed to fetch authenticated user')
      }

      return res.json()
    },
    initialData,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes (user session info changes very infrequently)
    refetchOnWindowFocus: false, // Avoid redundant fetches when switching tabs
  })
}
