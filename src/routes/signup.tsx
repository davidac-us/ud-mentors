import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isEduEmail = (e: string) => /\.edu(\.[a-z]{2,4})?$/i.test(e.trim())

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fullName.trim()) {
      toast.error('Please enter your full name.')
      return
    }
    if (!isEduEmail(email)) {
      toast.error('Please use your university email (.edu).')
      return
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }

    setSubmitting(true)

    try {
      const signUpTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out — Supabase may be rate-limiting. Wait a minute and try again.')), 30000),
      )
      const { data, error } = await Promise.race([
        supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { full_name: fullName.trim() } },
        }),
        signUpTimeout,
      ])

      if (error) {
        toast.error(error.message)
        return
      }

      if (!data.session) {
        // Email confirmation required — Supabase sent a confirmation email
        toast.success('Check your email to confirm your account, then sign in.')
        navigate({ to: '/login' })
        return
      }

      // Session returned immediately — go straight to onboarding
      navigate({ to: '/onboarding' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="mx-auto w-full max-w-[480px] px-6 pt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <div className="mx-auto w-full max-w-[480px] px-6 pt-8 flex-1">
        <h1 className="text-3xl font-bold text-foreground">Create your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You&apos;ll need a university email to join.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Maya Chen"
              autoComplete="name"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">University email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@udel.edu"
              autoComplete="email"
              required
            />
            <p className="text-xs text-muted-foreground">Must end in .edu</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full h-12 text-base"
          >
            {submitting ? 'Creating account...' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
