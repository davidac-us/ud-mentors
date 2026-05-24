import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, Loader } from './app.discover'
import { toast } from 'sonner'
import { LogOut, Check } from 'lucide-react'

export const Route = createFileRoute('/app/profile')({
  component: ProfileTab,
})

const PRESET_LANGUAGES = ['English', 'Spanish', 'Portuguese', 'Chinese', 'Arabic', 'French']
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate']

function ProfileTab() {
  const { profile, user, refreshProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [customLang, setCustomLang] = useState('')

  const [name, setName] = useState('')
  const [country, setCountry] = useState('')
  const [year, setYear] = useState('')
  const [major, setMajor] = useState('')
  const [languages, setLanguages] = useState<string[]>([])
  const [interests, setInterests] = useState<string[]>([])
  const [funFact, setFunFact] = useState('')
  const [bestAdvice, setBestAdvice] = useState('')
  const [mentorPrompt, setMentorPrompt] = useState('')
  const [menteePrompt, setMenteePrompt] = useState('')
  const [menteeCap, setMenteeCap] = useState(3)

  useEffect(() => {
    if (!profile) return
    setName(profile.name)
    setCountry(profile.country ?? '')
    setYear(profile.year ?? '')
    setMajor(profile.major ?? '')
    setLanguages(profile.languages)
    setInterests(profile.interests)
    setFunFact(profile.fun_fact ?? '')
    setBestAdvice(profile.best_advice ?? '')
    setMentorPrompt(profile.mentor_prompt ?? '')
    setMenteePrompt(profile.mentee_prompt ?? '')
    setMenteeCap(profile.mentee_cap ?? 3)
  }, [profile?.id])

  if (!profile || !user) return <Loader />

  const toggleLang = (lang: string) =>
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    )

  const addCustomLang = () => {
    const l = customLang.trim()
    if (!l || languages.includes(l)) return
    setLanguages((prev) => [...prev, l])
    setCustomLang('')
  }

  const save = async () => {
    setSaving(true)

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        name: name.trim().slice(0, 80),
        country: country.trim() || null,
        year: year || null,
        major: major.trim() || null,
        fun_fact: funFact.trim() || null,
        best_advice: bestAdvice.trim() || null,
        mentor_prompt: profile.role === 'mentee' ? mentorPrompt.trim() || null : null,
        mentee_prompt: profile.role === 'mentor' ? menteePrompt.trim() || null : null,
        mentee_cap: profile.role === 'mentor' ? menteeCap : null,
      })
      .eq('user_id', user.id)

    if (updateErr) {
      toast.error(updateErr.message)
      setSaving(false)
      return
    }

    // Replace languages
    await supabase.from('profile_languages').delete().eq('profile_id', profile.id)
    if (languages.length > 0) {
      await supabase.from('profile_languages').insert(
        languages.map((language) => ({ profile_id: profile.id, language })),
      )
    }

    // Replace interests
    await supabase.from('profile_interests').delete().eq('profile_id', profile.id)
    if (interests.length > 0) {
      await supabase.from('profile_interests').insert(
        interests.map((interest) => ({ profile_id: profile.id, interest })),
      )
    }

    await refreshProfile()
    toast.success('Profile saved!')
    setSaving(false)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate({ to: '/' })
  }

  return (
    <div className="px-5 pb-12 pt-6">
      {/* Header card */}
      <div className="mb-5 flex items-center gap-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
        <Avatar name={profile.name} size={64} />
        <div>
          <p className="font-semibold text-foreground">{profile.name}</p>
          <span className="mt-0.5 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            {profile.role === 'mentor' ? 'Mentor' : 'Mentee'}
          </span>
        </div>
      </div>

      {/* Basic info */}
      <div className="space-y-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="space-y-1.5">
          <Label>Full name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Home country</Label>
          <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Brazil" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
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
            <Input value={major} onChange={(e) => setMajor(e.target.value)} />
          </div>
        </div>

        {/* Languages */}
        <div className="space-y-2">
          <Label>Languages</Label>
          <div className="flex flex-wrap gap-2">
            {PRESET_LANGUAGES.map((lang) => {
              const on = languages.includes(lang)
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLang(lang)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition ${
                    on
                      ? 'border-transparent bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:border-primary/40'
                  }`}
                >
                  {on && <Check className="h-3 w-3" />}
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
          {languages
            .filter((l) => !PRESET_LANGUAGES.includes(l))
            .map((lang) => (
              <span
                key={lang}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary mr-1"
              >
                {lang}
                <button type="button" onClick={() => toggleLang(lang)} className="opacity-70 hover:opacity-100">
                  ✕
                </button>
              </span>
            ))}
        </div>
      </div>

      {/* Prompts */}
      <div className="mt-4 space-y-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="space-y-1.5">
          <Label>A fun fact about me…</Label>
          <Textarea
            value={funFact}
            onChange={(e) => setFunFact(e.target.value)}
            rows={2}
            className="resize-none"
            placeholder="I once…"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Best advice I ever got…</Label>
          <Textarea
            value={bestAdvice}
            onChange={(e) => setBestAdvice(e.target.value)}
            rows={2}
            className="resize-none"
            placeholder="The best advice…"
          />
        </div>
        {profile.role === 'mentee' && (
          <div className="space-y-1.5">
            <Label>I&apos;m looking for a mentor who…</Label>
            <Textarea
              value={mentorPrompt}
              onChange={(e) => setMentorPrompt(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        )}
        {profile.role === 'mentor' && (
          <div className="space-y-1.5">
            <Label>Mentees I&apos;d love to meet…</Label>
            <Textarea
              value={menteePrompt}
              onChange={(e) => setMenteePrompt(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        )}
      </div>

      {/* Mentor capacity */}
      {profile.role === 'mentor' && (
        <div className="mt-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)] space-y-4">
          <Label>Mentee capacity</Label>
          <div className="flex flex-col items-center gap-3">
            <span className="text-5xl font-bold text-primary">{menteeCap}</span>
            <div className="w-full px-2">
              <Slider
                min={1}
                max={5}
                step={1}
                value={[menteeCap]}
                onValueChange={([v]) => setMenteeCap(v)}
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>5</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <Button onClick={save} disabled={saving} className="mt-5 w-full rounded-full h-12 text-base">
        {saving ? 'Saving…' : 'Save changes'}
      </Button>

      <Button
        onClick={handleSignOut}
        variant="outline"
        className="mt-3 w-full rounded-full h-12 text-base"
      >
        <LogOut className="mr-2 h-4 w-4" /> Log out
      </Button>
    </div>
  )
}
