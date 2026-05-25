import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Calendar, MapPin, Plus, Repeat2, Search } from 'lucide-react'
import { EmptyState, Loader } from './app.discover'
import { toast } from 'sonner'
import type { Event } from '@/integrations/supabase/types'

export const Route = createFileRoute('/app/events')({
  component: EventsTab,
})

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const RECURRENCE = [
  { value: 'weekly',   label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly',  label: 'Monthly' },
] as const

type Recurrence = typeof RECURRENCE[number]['value']

/** Formats club meeting schedule into a human-readable string. */
function formatSchedule(days: string, time: string, recurrence: string): string {
  const dayList = days ? days.split(',').join(', ') : ''
  let timeStr = ''
  if (time) {
    const [h, m] = time.split(':').map(Number)
    const suffix = h >= 12 ? 'PM' : 'AM'
    timeStr = `at ${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`
  }
  const recurrenceLabels: Record<string, string> = {
    weekly: 'Weekly', biweekly: 'Every 2 Weeks', monthly: 'Monthly',
  }
  const parts = [dayList, timeStr].filter(Boolean).join(' ')
  const rec = recurrenceLabels[recurrence] ?? ''
  return [parts, rec].filter(Boolean).join(' · ')
}

function EventsTab() {
  const { profile } = useAuth()
  const [filter, setFilter] = useState<'event' | 'club'>('event')
  const [items, setItems] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [search, setSearch] = useState('')

  // Form state
  const [kind, setKind] = useState<'event' | 'club'>('event')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [loc, setLoc] = useState('')
  const [room, setRoom] = useState('')
  const [date, setDate] = useState('')
  const [meetingDays, setMeetingDays] = useState<string[]>([])
  const [meetingTime, setMeetingTime] = useState('')
  const [recurrence, setRecurrence] = useState<Recurrence>('weekly')
  const [posting, setPosting] = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
    setItems((data as Event[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const toggleDay = (day: string) =>
    setMeetingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )

  const resetForm = () => {
    setTitle(''); setDesc(''); setLoc(''); setRoom(''); setDate('')
    setMeetingDays([]); setMeetingTime(''); setRecurrence('weekly')
    setKind('event'); setPosting(false)
  }

  const post = async () => {
    if (!profile || !title.trim()) return
    setPosting(true)

    const { error } = await supabase.from('events').insert({
      poster_id: profile.id,
      type: kind,
      title: title.trim().slice(0, 120),
      description: desc.trim().slice(0, 1000),
      location: loc.trim().slice(0, 120),
      room: room.trim().slice(0, 80),
      date: kind === 'event' && date ? new Date(date).toISOString() : null,
      meeting_days: kind === 'club' ? meetingDays.join(',') : '',
      meeting_time: kind === 'club' ? meetingTime : '',
      recurrence:   kind === 'club' ? recurrence  : '',
    })

    if (error) { toast.error(error.message); setPosting(false); return }

    toast.success(kind === 'event' ? 'Event posted!' : 'Club posted!')
    setDialogOpen(false)
    resetForm()
    load()
  }

  if (loading) return <Loader />

  const filtered = items.filter((item) => {
    if (item.type !== filter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    )
  })

  return (
    <div className="px-5 pb-6 pt-6">
      {/* Header row */}
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Events</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o) }}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full">
              <Plus className="mr-1 h-4 w-4" /> Post
            </Button>
          </DialogTrigger>

          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Post an Event or Club</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Event / Club toggle */}
              <div className="flex gap-2">
                {(['event', 'club'] as const).map((k) => (
                  <Button
                    key={k}
                    type="button"
                    variant={kind === k ? 'default' : 'outline'}
                    onClick={() => setKind(k)}
                    className="flex-1 rounded-full capitalize"
                  >
                    {k}
                  </Button>
                ))}
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder={kind === 'event' ? 'International Student Mixer' : 'UD Photography Club'}
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  className="resize-none"
                />
              </div>

              {/* Location + Room (side by side) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input
                    value={loc}
                    onChange={(e) => setLoc(e.target.value)}
                    maxLength={120}
                    placeholder="Trabant Center"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Room</Label>
                  <Input
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    maxLength={80}
                    placeholder="Room 209"
                  />
                </div>
              </div>

              {/* ── Event-only: Date & Time ── */}
              {kind === 'event' && (
                <div className="space-y-1.5">
                  <Label>Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              )}

              {/* ── Club-only: Meeting schedule ── */}
              {kind === 'club' && (
                <>
                  {/* Day picker */}
                  <div className="space-y-2">
                    <Label>Meeting Days</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`rounded-full border px-3 py-1 text-sm transition ${
                            meetingDays.includes(day)
                              ? 'border-transparent bg-primary text-primary-foreground'
                              : 'border-border bg-card hover:border-primary/40'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time + Recurrence */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Meeting Time</Label>
                      <Input
                        type="time"
                        value={meetingTime}
                        onChange={(e) => setMeetingTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Recurrence</Label>
                      <div className="flex flex-col gap-1.5">
                        {RECURRENCE.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setRecurrence(value)}
                            className={`rounded-full border px-3 py-1 text-sm transition text-left ${
                              recurrence === value
                                ? 'border-transparent bg-primary text-primary-foreground'
                                : 'border-border bg-card hover:border-primary/40'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Button
                onClick={post}
                disabled={!title.trim() || posting}
                className="w-full rounded-full"
              >
                {posting ? 'Posting…' : 'Publish'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 inline-flex rounded-full bg-muted p-1">
        {(['event', 'club'] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setSearch('') }}
            className={`rounded-full px-5 py-1.5 text-sm font-medium transition ${
              filter === f ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'
            }`}
          >
            {f === 'event' ? 'Events' : 'Clubs'}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${filter === 'event' ? 'events' : 'clubs'}…`}
          className="rounded-full pl-9"
        />
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-8 w-8" />}
          title={search ? 'No results found' : filter === 'event' ? 'No events yet' : 'No clubs yet'}
          desc={search ? 'Try different keywords.' : 'Be the first to post one!'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Event card ──────────────────────────────────────────────────────────────

function EventCard({ event: e }: { event: Event }) {
  const schedule =
    e.type === 'club'
      ? formatSchedule(
          (e as Event & { meeting_days: string }).meeting_days ?? '',
          (e as Event & { meeting_time: string }).meeting_time ?? '',
          (e as Event & { recurrence: string }).recurrence ?? '',
        )
      : null

  const fullLocation = [
    e.location,
    (e as Event & { room: string }).room,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-foreground">{e.title}</h3>
        <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
          {e.type}
        </span>
      </div>

      {e.description && (
        <p className="mt-2 text-sm text-muted-foreground line-clamp-3">{e.description}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {e.date && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {new Date(e.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        )}
        {schedule && (
          <span className="inline-flex items-center gap-1">
            <Repeat2 className="h-3.5 w-3.5" />
            {schedule}
          </span>
        )}
        {fullLocation && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {fullLocation}
          </span>
        )}
      </div>
    </div>
  )
}
