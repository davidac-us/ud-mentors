import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import udMonogram from '@/assets/ud-monogram.png'

const FLAGS = [
  '🇧🇷', '🇨🇳', '🇮🇳', '🇲🇽', '🇰🇷',
  '🇳🇬', '🇵🇰', '🇩🇪', '🇯🇵', '🇫🇷',
  '🇮🇹', '🇸🇦', '🇦🇺', '🇵🇭', '🇹🇷',
  '🇷🇺', '🇨🇦', '🇿🇦', '🇵🇹', '🇬🇧',
]

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  const { session, profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (session) {
      if (profile?.onboarded) {
        navigate({ to: '/app/discover' })
      } else {
        navigate({ to: '/onboarding' })
      }
    }
  }, [session, profile, loading, navigate])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-[480px] flex flex-col items-center gap-8">
        <img src={udMonogram} alt="University of Delaware" className="h-20 w-auto" />

        <div className="grid grid-cols-5 gap-3">
          {FLAGS.map((flag) => (
            <span
              key={flag}
              className="flex items-center justify-center text-3xl select-none"
              style={{ fontFamily: "'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif" }}
            >
              {flag}
            </span>
          ))}
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Hey there!</h1>
          <p className="text-lg text-muted-foreground">Find your people at UD.</p>
        </div>

        <div className="w-full flex flex-col gap-3">
          <Link
            to="/signup"
            className="w-full rounded-full bg-primary py-4 text-center text-base font-semibold text-primary-foreground hover:opacity-90 transition-opacity block"
          >
            Let&apos;s go
          </Link>
          <Link
            to="/login"
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2 block"
          >
            I already have an account
          </Link>
        </div>
      </div>
    </div>
  )
}
