import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import type { ProfileWithDetails } from '@/lib/auth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Heart, X, Sparkles, MapPin, GraduationCap, Check } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/app/discover')({
  component: Discover,
})

// ─── Shared UI components (exported for other tabs to import) ─────────────────

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-card p-10 text-center shadow-[var(--shadow-soft)]">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-primary-foreground"
      style={{
        width: size,
        height: size,
        background: 'var(--gradient-warm)',
        fontSize: size * 0.38,
      }}
    >
      {initials || '?'}
    </div>
  )
}

export function Loader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function Discover() {
  const { profile } = useAuth()
  if (!profile) return <Loader />
  return profile.role === 'mentor' ? <MentorRequests /> : <MenteeDiscover />
}

// ─── Compatibility score ──────────────────────────────────────────────────────

function compatScore(me: ProfileWithDetails, other: ProfileWithDetails): number {
  let score = 0
  if (me.major && me.major === other.major) score += 40
  if (me.country && me.country === other.country) score += 30
  for (const lang of me.languages) {
    if (other.languages.includes(lang)) score += 20
  }
  for (const interest of me.interests) {
    if (other.interests.includes(interest)) score += 10
  }
  return score
}

// ─── Mentee view: swipe through mentors ───────────────────────────────────────

type DiscoverProfile = ProfileWithDetails & { score: number }

function MenteeDiscover() {
  const { profile } = useAuth()
  const [cards, setCards] = useState<DiscoverProfile[]>([])
  const [idx, setIdx] = useState(0)
  const [loadingCards, setLoadingCards] = useState(true)

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      // IDs already in a match relationship (any status except expired)
      const { data: existing } = await supabase
        .from('matches')
        .select('mentor_id, cooldown_until')
        .eq('mentee_id', profile.id)

      const now = new Date().toISOString()
      const excludeIds = (existing ?? [])
        .filter((m) => {
          // Exclude if still in cooldown (declined) OR if pending/matched
          if (m.cooldown_until && m.cooldown_until > now) return true
          return true // exclude all existing matches from feed
        })
        .map((m) => m.mentor_id)

      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'mentor')
        .eq('onboarded', true)
        .neq('id', profile.id)

      // Apply exclusions
      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`)
      }

      const { data: mentors } = await query.limit(100)

      if (!mentors?.length) {
        setCards([])
        setLoadingCards(false)
        return
      }

      // Fetch languages + interests for all mentors
      const ids = mentors.map((m) => m.id)
      const [{ data: langs }, { data: ints }] = await Promise.all([
        supabase.from('profile_languages').select('profile_id, language').in('profile_id', ids),
        supabase.from('profile_interests').select('profile_id, interest').in('profile_id', ids),
      ])

      const langMap: Record<string, string[]> = {}
      for (const row of langs ?? []) {
        ;(langMap[row.profile_id] ??= []).push(row.language)
      }
      const intMap: Record<string, string[]> = {}
      for (const row of ints ?? []) {
        ;(intMap[row.profile_id] ??= []).push(row.interest)
      }

      const enriched: DiscoverProfile[] = mentors.map((m) => {
        const full: ProfileWithDetails = {
          ...m,
          languages: langMap[m.id] ?? [],
          interests: intMap[m.id] ?? [],
        }
        return { ...full, score: compatScore(profile, full) }
      })

      // Sort by compatibility score (desc)
      enriched.sort((a, b) => b.score - a.score)
      setCards(enriched)
      setLoadingCards(false)
    })()
  }, [profile?.id])

  const skip = () => setIdx((i) => i + 1)

  const sendRequest = async () => {
    if (!profile) return
    const mentor = cards[idx]
    if (!mentor) return

    // Check confirmed match limit (max 3)
    const { count } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('mentee_id', profile.id)
      .eq('status', 'matched')

    if ((count ?? 0) >= 3) {
      toast.error("You've already reached 3 matched mentors.")
      return
    }

    const { error } = await supabase.from('matches').insert({
      mentee_id: profile.id,
      mentor_id: mentor.id,
      status: 'pending',
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(`Match request sent to ${mentor.name.split(' ')[0]}!`)
    setIdx((i) => i + 1)
  }

  if (loadingCards) return <Loader />

  const current = cards[idx]

  return (
    <div className="px-5 pb-6 pt-6">
      <Header title="Discover" subtitle="Find your mentor" />
      {!current ? (
        <EmptyState
          icon={<Sparkles className="h-8 w-8" />}
          title="You're all caught up"
          desc="Check back later — more mentors join every week."
        />
      ) : (
        <>
          <MentorCard profile={current} />
          <div className="mt-6 flex items-center justify-center gap-8">
            <button
              onClick={skip}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-border bg-card text-muted-foreground shadow-[var(--shadow-soft)] transition hover:scale-105 hover:border-destructive hover:text-destructive"
              aria-label="Skip"
            >
              <X className="h-7 w-7" />
            </button>
            <button
              onClick={sendRequest}
              className="flex h-20 w-20 items-center justify-center rounded-full text-primary-foreground shadow-[var(--shadow-card)] transition hover:scale-105"
              style={{ background: 'var(--gradient-warm)' }}
              aria-label="Send match request"
            >
              <Heart className="h-9 w-9" fill="currentColor" />
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function MentorCard({ profile: p }: { profile: ProfileWithDetails }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-card)]">
      <div
        className="flex h-52 items-center justify-center text-6xl font-bold text-primary-foreground"
        style={{ background: 'var(--gradient-warm)' }}
      >
        <Avatar name={p.name} size={96} />
      </div>

      <div className="space-y-4 p-5">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{p.name}</h2>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {p.country && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {p.country}
              </span>
            )}
            {(p.year || p.major) && (
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5" />
                {[p.year, p.major].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        </div>

        {p.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {p.interests.slice(0, 8).map((i) => (
              <span key={i} className="rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground">
                {i}
              </span>
            ))}
          </div>
        )}

        {p.fun_fact && <Prompt label="Fun fact" text={p.fun_fact} />}
        {p.best_advice && <Prompt label="Best advice" text={p.best_advice} />}
        {p.mentee_prompt && <Prompt label="Looking for mentees who" text={p.mentee_prompt} />}

        {p.languages.length > 0 && (
          <p className="text-xs text-muted-foreground">Speaks: {p.languages.join(', ')}</p>
        )}
      </div>
    </div>
  )
}

function Prompt({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl bg-muted/60 p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm text-foreground">{text}</p>
    </div>
  )
}

// ─── Mentor view: pending match requests ──────────────────────────────────────

type PendingRequest = {
  id: string
  mentee_id: string
  mentee: ProfileWithDetails | null
}

function MentorRequests() {
  const { profile } = useAuth()
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [loadingReqs, setLoadingReqs] = useState(true)

  const load = async () => {
    if (!profile) return
    const now = new Date().toISOString()

    const { data: pending } = await supabase
      .from('matches')
      .select('id, mentee_id')
      .eq('mentor_id', profile.id)
      .eq('status', 'pending')
      .gt('expires_at', now)
      .order('created_at', { ascending: false })

    if (!pending?.length) {
      setRequests([])
      setLoadingReqs(false)
      return
    }

    const menteeIds = pending.map((r) => r.mentee_id)
    const [{ data: menteeProfiles }, { data: langs }, { data: ints }] = await Promise.all([
      supabase.from('profiles').select('*').in('id', menteeIds),
      supabase.from('profile_languages').select('profile_id, language').in('profile_id', menteeIds),
      supabase.from('profile_interests').select('profile_id, interest').in('profile_id', menteeIds),
    ])

    const langMap: Record<string, string[]> = {}
    for (const row of langs ?? []) (langMap[row.profile_id] ??= []).push(row.language)
    const intMap: Record<string, string[]> = {}
    for (const row of ints ?? []) (intMap[row.profile_id] ??= []).push(row.interest)

    setRequests(
      pending.map((r) => {
        const p = menteeProfiles?.find((m) => m.id === r.mentee_id)
        return {
          id: r.id,
          mentee_id: r.mentee_id,
          mentee: p
            ? { ...p, languages: langMap[p.id] ?? [], interests: intMap[p.id] ?? [] }
            : null,
        }
      }),
    )
    setLoadingReqs(false)
  }

  useEffect(() => { load() }, [profile?.id])

  const respond = async (matchId: string, accept: boolean) => {
    if (accept) {
      await supabase
        .from('matches')
        .update({ status: 'matched', responded_at: new Date().toISOString() })
        .eq('id', matchId)
      toast.success('Match accepted! You can now chat.')
    } else {
      await supabase
        .from('matches')
        .update({
          status: 'declined',
          responded_at: new Date().toISOString(),
          cooldown_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', matchId)
      toast('Request declined.')
    }
    load()
  }

  if (loadingReqs) return <Loader />

  return (
    <div className="px-5 pb-6 pt-6">
      <Header title="Match Requests" subtitle="Mentees who want to connect with you" />
      {requests.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-8 w-8" />}
          title="No pending requests"
          desc="When a mentee sends you a request, it will appear here."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((r) =>
            r.mentee ? (
              <div key={r.id} className="rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
                <div className="flex items-center gap-3">
                  <Avatar name={r.mentee.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{r.mentee.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[r.mentee.country, r.mentee.major].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                {r.mentee.mentor_prompt && (
                  <p className="mt-3 rounded-xl bg-muted/60 p-3 text-sm italic">
                    &ldquo;{r.mentee.mentor_prompt}&rdquo;
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full"
                    onClick={() => respond(r.id, false)}
                  >
                    <X className="mr-1 h-4 w-4" /> Decline
                  </Button>
                  <Button className="flex-1 rounded-full" onClick={() => respond(r.id, true)}>
                    <Check className="mr-1 h-4 w-4" /> Accept
                  </Button>
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  )
}
