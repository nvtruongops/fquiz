'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, ArrowRight, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { withCsrfHeaders } from '@/lib/security/csrf'

export default function AdminLoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    fetch('/api/auth/me', { cache: 'no-store' })
      .then(async (res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data?.user?.role === 'admin') router.replace('/')
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ identifier, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Login failed')
      }

      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Login error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-radial from-card via-background to-background relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none -top-48 -left-48" />
      <div className="absolute w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none -bottom-32 -right-32" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">FQuiz Admin Console</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Secure Administration Portal for Administrators</p>
        </div>

        <Card className="border-border bg-card/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold">Admin Sign In</CardTitle>
            <CardDescription className="text-xs">
              Only accounts with Administrator privileges can access this portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="admin-identifier" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Email or Username
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <Input
                    id="admin-identifier"
                    type="text"
                    required
                    placeholder="admin@example.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-9 bg-background/50 border-input focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="admin-password" className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
                  <Input
                    id="admin-password"
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-background/50 border-input focus:border-primary"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-sm font-bold gap-2 mt-2 shadow-md cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 text-center">
          <a
            href={process.env.NEXT_PUBLIC_WEB_URL || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/login'}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1.5 px-3 rounded-lg hover:bg-muted/50 border border-border/40"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Student &amp; Teacher Portal
          </a>
        </div>

        <div className="text-center mt-6 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} FQuiz Platform • Zero Trust Isolation Architecture
        </div>
      </div>
    </div>
  )
}
