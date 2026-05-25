import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'
import { GraduationCap, UserCog, ArrowLeft, ArrowRight, Sparkles, Check } from 'lucide-react'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

const INTERESTS = [
  'Cooking', 'Hiking', 'Gaming', 'Music', 'Sports', 'Art',
  'Reading', 'Movies', 'Travel', 'Photography', 'Coding', 'Dance',
  'Languages', 'Coffee', 'Fitness', 'Volunteering', 'Anime',
  'Board Games', 'Fashion', 'Politics',
]

const PRESET_LANGUAGES = ['English', 'Spanish', 'Portuguese', 'Chinese', 'Arabic', 'French']

const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate']

type FormData = {
  role: 'mentee' | 'mentor' | null
  country: string
  year: string
  major: string
  languages: string[]
  interests: string[]
  fun_fact: string
  best_advice: string
  mentor_prompt: string
  mentee_prompt: string
  mentee_cap: number
}

function OnboardingPage() {
  const { user, profile, loading, markOnboarded } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [customLang, setCustomLang] = useState('')

  const [form, setForm] = useState<FormData>({
    role: null,
    country: '',
    year: '',
    major: '',
    languages: [],
    interests: [],
    fun_fact: '',
    best_advice: '',
    mentor_prompt: '',
    mentee_prompt: '',
    mentee_cap: 3,
  })

  useEffect(() => {
    if (!loading && !user) navigate({ to: '/login' })
    if (!loading && profile?.onboarded) navigate({ to: '/app/discover' })
  }, [user, profile, loading, navigate])

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const toggleLang = (lang: string) =>
    set('languages', form.languages.includes(lang)
      ? form.languages.filter((l) => l !== lang)
      : [...form.languages, lang])

  const toggleInterest = (i: string) =>
    set('interests', form.interests.includes(i)
      ? form.interests.filter((x) => x !== i)
      : [...form.interests, i])

  const addCustomLang = () => {
    const l = customLang.trim()
    if (!l || form.languages.includes(l)) return
    set('languages', [...form.languages, l])
    setCustomLang('')
  }

  const finish = async () => {
    if (!user || !form.role) return
    setSaving(true)
    try {
      // Upsert the profile — creates it if the trigger didn't fire, updates it if it exists
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Supabase timed out. Is the project paused or unreachable?')), 60000),
      )
      const { data: myProfile, error: upsertErr } = await Promise.race([
        supabase
          .from('profiles')
          .upsert(
            {
              user_id: user.id,
              name: profile?.name || user.email?.split('@')[0] || '',
              role: form.role,
              country: form.country.trim() || null,
              university: 'University of Delaware',
              year: form.year || null,
              major: form.major.trim() || null,
              fun_fact: form.fun_fact.trim() || null,
              best_advice: form.best_advice.trim() || null,
              mentor_prompt: form.role === 'mentee' ? form.mentor_prompt.trim() || null : null,
              mentee_prompt: form.role === 'mentor' ? form.mentee_prompt.trim() || null : null,
              mentee_cap: form.role === 'mentor' ? form.mentee_cap : null,
              onboarded: true,
            },
            { onConflict: 'user_id' },
          )
          .select('id')
          .single(),
        timeout,
      ])

      if (upsertErr || !myProfile) {
        toast.error(upsertErr?.message ?? 'Failed to save profile. Please try again.')
        return
      }

      // Replace languages
      await supabase.from('profile_languages').delete().eq('profile_id', myProfile.id)
      if (form.languages.length > 0) {
        await supabase.from('profile_languages').insert(
          form.languages.map((language) => ({ profile_id: myProfile.id, language })),
        )
      }

      // Replace interests
      await supabase.from('profile_interests').delete().eq('profile_id', myProfile.id)
      if (form.interests.length > 0) {
        await supabase.from('profile_interests').insert(
          form.interests.map((interest) => ({ profile_id: myProfile.id, interest })),
        )
      }

      markOnboarded(form.languages, form.interests)
      navigate({ to: '/app/discover' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const TOTAL_STEPS = 7

  const steps = [
    {
      title: 'Who are you?',
      valid: form.role !== null,
      content: (
        <div className="space-y-3">
          <RoleCard
            active={form.role === 'mentee'}
            onClick={() => set('role', 'mentee')}
            icon={<GraduationCap className="h-6 w-6" />}
            title="First-year international student"
            desc="I'm new to UD and looking for guidance."
          />
          <RoleCard
            active={form.role === 'mentor'}
            onClick={() => set('role', 'mentor')}
            icon={<UserCog className="h-6 w-6" />}
            title="Experienced student mentor"
            desc="I've been here a while and want to help."
          />
        </div>
      ),
    },
    {
      title: 'Tell us about you',
      valid: form.country.trim().length > 0,
      content: (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Home country</Label>
            <Input
              value={form.country}
              onChange={(e) => set('country', e.target.value)}
              placeholder="Brazil"
            />
          </div>
          <div className="space-y-1.5">
            <Label>University</Label>
            <Input value="University of Delaware" readOnly className="bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Select value={form.year} onValueChange={(v) => set('year', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Major</Label>
              <Input
                value={form.major}
                onChange={(e) => set('major', e.target.value)}
                placeholder="Computer Science"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Languages spoken</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_LANGUAGES.map((lang) => {
                const on = form.languages.includes(lang)
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLang(lang)}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition ${
                      on
                        ? 'border-transparent bg-primary text-primary-foreground'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    {on && <Check className="h-3.5 w-3.5" />}
                    {lang}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2">
              <Input
                value={customLang}
                onChange={(e) => setCustomLang(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomLang())}
                placeholder="Add another language…"
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={addCustomLang} disabled={!customLang.trim()}>
                Add
              </Button>
            </div>
            {form.languages.filter((l) => !PRESET_LANGUAGES.includes(l)).map((lang) => (
              <span
                key={lang}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
              >
                {lang}
                <button type="button" onClick={() => toggleLang(lang)} className="ml-0.5 opacity-70 hover:opacity-100">
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: '',
      valid: true,
      content: (
        <div className="flex flex-col items-center py-10 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-12 w-12" />
          </div>
          <h2 className="mt-6 text-3xl font-bold">Now, let&apos;s build your profile</h2>
          <p className="mt-3 max-w-xs text-muted-foreground">
            {form.role === 'mentor'
              ? "Share what makes you a great mentor."
              : "Share a bit so mentors can get to know you."}
          </p>
        </div>
      ),
    },
    {
      title: 'What are you into?',
      valid: true,
      content: (
        <div>
          <p className="mb-4 text-sm text-muted-foreground">Pick as many as you like.</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((interest) => (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                  form.interests.includes(interest)
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:border-primary/40'
                }`}
              >
                {interest}
              </button>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'A fun fact about me…',
      valid: true,
      content: (
        <Textarea
          value={form.fun_fact}
          onChange={(e) => set('fun_fact', e.target.value)}
          rows={5}
          placeholder="I once…"
          className="resize-none"
        />
      ),
    },
    {
      title: 'Best advice I ever got…',
      valid: true,
      content: (
        <Textarea
          value={form.best_advice}
          onChange={(e) => set('best_advice', e.target.value)}
          rows={5}
          placeholder="The best advice…"
          className="resize-none"
        />
      ),
    },
    form.role === 'mentor'
      ? {
          title: 'Almost done!',
          valid: true,
          content: (
            <div className="space-y-6">
              <div className="space-y-1.5">
                <Label>Mentees I&apos;d love to meet…</Label>
                <Textarea
                  value={form.mentee_prompt}
                  onChange={(e) => set('mentee_prompt', e.target.value)}
                  rows={4}
                  placeholder="I love working with students who…"
                  className="resize-none"
                />
              </div>
              <div className="space-y-4">
                <Label>How many mentees can you take on?</Label>
                <div className="flex flex-col items-center gap-4">
                  <span className="text-7xl font-bold text-primary">{form.mentee_cap}</span>
                  <div className="w-full px-2">
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={[form.mentee_cap]}
                      onValueChange={([v]) => set('mentee_cap', v)}
                      className="w-full"
                    />
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                      <span>1</span>
                      <span>5</span>
                    </div>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  You can change this later in your profile.
                </p>
              </div>
            </div>
          ),
        }
      : {
          title: 'Almost done!',
          valid: true,
          content: (
            <div className="space-y-1.5">
              <Label>I&apos;m looking for a mentor who…</Label>
              <Textarea
                value={form.mentor_prompt}
                onChange={(e) => set('mentor_prompt', e.target.value)}
                rows={5}
                placeholder="Someone who can help me navigate…"
                className="resize-none"
              />
            </div>
          ),
        },
  ]

  const cur = steps[step]

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[480px] flex-col px-6 pb-10 pt-8">
        {/* Progress bar */}
        <div className="mb-6 flex gap-1">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {cur.title && (
          <h1 className="mb-6 text-2xl font-bold text-foreground">{cur.title}</h1>
        )}

        <div className="flex-1">{cur.content}</div>

        <div className="mt-10 flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 rounded-full">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!cur.valid}
              className="flex-1 rounded-full"
            >
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={finish}
              disabled={saving || !form.role}
              className="flex-1 rounded-full"
            >
              {saving ? 'Saving…' : "Let's go!"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function RoleCard({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-4 rounded-2xl border-2 p-4 text-left transition ${
        active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
      }`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      </div>
    </button>
  )
}
