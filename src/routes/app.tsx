import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { BottomNav } from '@/components/BottomNav'

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

  if (loading || !session || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
