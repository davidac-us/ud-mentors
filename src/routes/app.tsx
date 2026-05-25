import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { BottomNav } from '@/components/BottomNav'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/app')({
  component: AppLayout,
})

function AppLayout() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!session) {
      navigate({ to: '/login' })
    } else if (profile !== null && !profile.onboarded) {
      navigate({ to: '/onboarding' })
    }
  }, [session, profile, loading, navigate])

  // Auth + profile fetch in progress — spinner (8 second max due to timeout in fetchProfileForUser)
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  // No session — useEffect handles redirect to /login
  if (!session) return null

  // Loading finished but profile is null — fetch timed out or failed
  // (e.g. network issue, ad blocker blocking Supabase)
  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t load your profile. Check your connection and try again.
        </p>
        <Button variant="outline" className="rounded-full" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-[480px]">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
