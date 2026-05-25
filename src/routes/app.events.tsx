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
import { Calendar, MapPin, Pencil, Plus, Repeat2, Search, Trash2, X } from 'lucide-react'
import { EmptyState, Loader, Avatar } from './app.discover'
import { toast } from 'sonner'
import type { Event } from '@/integrations/supabase/types'

export const Route = createFileRoute('/app/events')({
  component: EventsTab,
})

// ─── Types ───────────────────────────────────────────────────────────────────

type EventRow = Event & { poster_name: string }

// ─── Constants ───────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const RECURRENCE = [
  { value: 'weekly',   label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly',  label: 'Monthly' },
] as const
type Recurrence = typeof RECURRENCE[number]['value']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSchedule(days: string, time: string, recurrence: string): string {
  const dayList = days ? days.split(',').join(', ') : ''
  let timeStr = ''
  if (time) {
    const [h, m] = time.split(':').map(Number)
    const suffix = h >= 12 ? 'PM' : 'AM'
    timeStr = `at ${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`
  }
  const recLabel: Record<string, string> = {
    weekly: 'Weekly', biweekly: 'Every 2 Weeks', monthly: 'Monthly',
  }
  return [[dayList, timeStr].filter(Boolean).join(' '), recLabel[recurrence]]
    .filter(Boolean).join(' · ')
}

function isoToLocal(iso: string): string {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

// ─── Main tab ────────────────────────────────────────────────────────────────

function EventsTab() {
  const { profile } = useAuth()
  const [filter, setFilter] = useState<'event' | 'club'>('event')
  const [items, setItems] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<EventRow | null>(null)
  const [myPostsOpen, setMyPostsOpen] = useState(false)

  // Post / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
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

  // ── Data loading ────────────────────────────────────────────────────────────

  const load = async () => {
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })

    if (!eventsData?.length) { setItems([]); setLoading(false); return }

    // Fetch poster names in one query
    const posterIds = [...new Set(eventsData.map((e) => e.poster_id))]
    const { data: posters } = await supabase
      .from('profiles').select('id, name').in('id', posterIds)
    const posterMap: Record<string, string> = {}
    for (const p of posters ?? []) posterMap[p.id] = p.name

    setItems(eventsData.map((e) => ({ ...e, poster_name: posterMap[e.poster_id] ?? 'Unknown' })))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // ── Form helpers ────────────────────────────────────────────────────────────

  const toggleDay = (day: string) =>
    setMeetingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )

  const resetForm = () => {
    setEditingId(null); setTitle(''); setDesc(''); setLoc(''); setRoom('')
    setDate(''); setMeetingDays([]); setMeetingTime('')
    setRecurrence('weekly'); setKind('event'); setPosting(false)
  }

  const openEdit = (e: EventRow) => {
    setEditingId(e.id)
    setKind(e.type)
    setTitle(e.title)
    setDesc(e.description ?? '')
    setLoc(e.location ?? '')
    setRoom((e as EventRow & { room?: string }).room ?? '')
    setDate(e.date ? isoToLocal(e.date) : '')
    const asClub = e as EventRow & { meeting_days?: string; meeting_time?: string; recurrence?: string }
    setMeetingDays(asClub.meeting_days ? asClub.meeting_days.split(',').filter(Boolean) : [])
    setMeetingTime(asClub.meeting_time ?? '')
    setRecurrence((asClub.recurrence as Recurrence) || 'weekly')
    setMyPostsOpen(false)
    setSelected(null)
    setDialogOpen(true)
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  const post = async () => {
    if (!profile || !title.trim()) return
    setPosting(true)

    const payload = {
      type: kind,
      title: title.trim().slice(0, 120),
      description: desc.trim().slice(0, 1000),
      location: loc.trim().slice(0, 120),
      room: room.trim().slice(0, 80),
      date: date ? new Date(date).toISOString() : null,
      meeting_days: kind === 'club' ? meetingDays.join(',') : '',
      meeting_time: kind === 'club' ? meetingTime : '',
      recurrence:   kind === 'club' ? recurrence  : '',
    }

    if (editingId) {
      // Update — don't touch community_room_id
      const { error } = await supabase.from('events').update(payload).eq('id', editingId)
      if (error) { toast.error(error.message); setPosting(false); return }
    } else {
      // Create a group chat room first if this is a club
      let communityRoomId: string | null = null
      if (kind === 'club') {
        const { data: chatRoom } = await supabase
          .from('community_rooms')
          .insert({ type: 'group', name: title.trim().slice(0, 60) })
          .select('id')
          .single()
        communityRoomId = chatRoom?.id ?? null
      }

      const { data: newEvent, error } = await supabase
        .from('events')
        .insert({ ...payload, poster_id: profile.id, community_room_id: communityRoomId })
        .select('id')
        .single()

      if (error || !newEvent) { toast.error(error?.message ?? 'Failed to post.'); setPosting(false); return }

      // Auto-join creator to the club's group chat
      if (communityRoomId) {
        await supabase.from('community_room_members').insert({
          room_id: communityRoomId,
          profile_id: profile.id,
        })
      }
    }

    toast.success(editingId ? 'Post updated!' : kind === 'event' ? 'Event posted!' : 'Club posted!')
    setDialogOpen(false)
    resetForm()
    load()
  }

  const deletePost = async (id: string) => {
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success('Post deleted.')
    setMyPostsOpen(false)
    setSelected(null)
    load()
  }

  // ── Derived state ───────────────────────────────────────────────────────────

  if (loading) return <Loader />

  const filtered = items.filter((item) => {
    if (item.type !== filter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
  })

  const myPosts = items.filter((i) => i.poster_id === profile?.id)

  // ── Detail overlay (replaces list) ──────────────────────────────────────────

  if (selected) {
    return (
      <DetailView
        event={selected}
        profile={profile}
        isOwner={selected.poster_id === profile?.id}
        onClose={() => setSelected(null)}
        onEdit={() => openEdit(selected)}
        onDelete={() => deletePost(selected.id)}
      />
    )
  }

  // ── Main list ───────────────────────────────────────────────────────────────

  return (
    <div className="px-5 pb-6 pt-6">
      {/* Header */}
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Events</h1>

        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o) }}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full">
              <Plus className="mr-1 h-4 w-4" /> Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Post' : 'Post an Event or Club'}</DialogTitle>
            </DialogHeader>
            <PostForm
              kind={kind} setKind={setKind}
              title={title} setTitle={setTitle}
              desc={desc} setDesc={setDesc}
              loc={loc} setLoc={setLoc}
              room={room} setRoom={setRoom}
              date={date} setDate={setDate}
              meetingDays={meetingDays} toggleDay={toggleDay}
              meetingTime={meetingTime} setMeetingTime={setMeetingTime}
              recurrence={recurrence} setRecurrence={setRecurrence}
              posting={posting}
              onSubmit={post}
              isEditing={!!editingId}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Your postings link */}
      <button
        onClick={() => setMyPostsOpen(true)}
        className="mb-5 text-xs font-medium text-primary hover:underline"
      >
        Your postings ({myPosts.length})
      </button>

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

      {/* Search */}
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
            <EventCard key={e.id} event={e} onClick={() => setSelected(e)} />
          ))}
        </div>
      )}

      {/* Your Postings dialog */}
      <Dialog open={myPostsOpen} onOpenChange={setMyPostsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Your Postings</DialogTitle>
          </DialogHeader>
          {myPosts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              You haven&apos;t posted anything yet.
            </p>
          ) : (
            <div className="space-y-3">
              {myPosts.map((e) => (
                <div key={e.id} className="rounded-2xl bg-muted/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground text-sm">{e.title}</p>
                      <p className="text-xs capitalize text-muted-foreground">{e.type}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => openEdit(e)}
                        className="rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deletePost(e.id)}
                        className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Detail overlay ───────────────────────────────────────────────────────────

function DetailView({
  event: e,
  profile,
  isOwner,
  onClose,
  onEdit,
  onDelete,
}: {
  event: EventRow
  profile: import('@/lib/auth').ProfileWithDetails | null
  isOwner: boolean
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const asClub = e as EventRow & { meeting_days?: string; meeting_time?: string; recurrence?: string; room?: string }
  const schedule = e.type === 'club'
    ? formatSchedule(asClub.meeting_days ?? '', asClub.meeting_time ?? '', asClub.recurrence ?? '')
    : null
  const fullLocation = [e.location, asClub.room].filter(Boolean).join(' · ')
  const communityRoomId = e.community_room_id ?? null

  // Club membership state
  const [isMember, setIsMember] = useState<boolean | null>(null)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (!communityRoomId || !profile) return
    supabase
      .from('community_room_members')
      .select('room_id')
      .eq('room_id', communityRoomId)
      .eq('profile_id', profile.id)
      .maybeSingle()
      .then(({ data }) => setIsMember(!!data))
  }, [communityRoomId, profile?.id])

  const joinClub = async () => {
    if (!profile || !communityRoomId) return
    setJoining(true)
    const { error } = await supabase
      .from('community_room_members')
      .insert({ room_id: communityRoomId, profile_id: profile.id })
    if (error) { toast.error(error.message); setJoining(false); return }
    setIsMember(true)
    setJoining(false)
    toast.success('Joined! Open the Community tab to chat.')
  }

  const leaveClub = async () => {
    if (!profile || !communityRoomId) return
    setJoining(true)
    await supabase
      .from('community_room_members')
      .delete()
      .eq('room_id', communityRoomId)
      .eq('profile_id', profile.id)
    setIsMember(false)
    setJoining(false)
    toast.success('You left the club.')
  }

  return (
    <div className="min-h-screen bg-background px-5 pb-10 pt-6">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" /> Close
        </button>
        {isOwner && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-full" onClick={onEdit}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
              onClick={onDelete}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        )}
      </div>

      {/* Type badge + title */}
      <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
        {e.type}
      </span>
      <h1 className="mt-3 text-2xl font-bold text-foreground">{e.title}</h1>

      {/* Meta row */}
      <div className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
        {e.date && (
          <span className="inline-flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            {new Date(e.date).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}
          </span>
        )}
        {schedule && (
          <span className="inline-flex items-center gap-2">
            <Repeat2 className="h-4 w-4 shrink-0" />
            {schedule}
          </span>
        )}
        {fullLocation && (
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            {fullLocation}
          </span>
        )}
      </div>

      {/* Description */}
      {e.description && (
        <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {e.description}
        </p>
      )}

      {/* Posted by */}
      <div className="mt-8 flex items-center gap-2 border-t border-border pt-5">
        <Avatar name={e.poster_name} size={32} />
        <div>
          <p className="text-[11px] text-muted-foreground">Posted by</p>
          <p className="text-sm font-semibold text-foreground">{e.poster_name}</p>
        </div>
      </div>

      {/* Join / Leave club */}
      {e.type === 'club' && communityRoomId && isMember !== null && (
        <div className="mt-4">
          {isMember ? (
            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={leaveClub}
              disabled={joining}
            >
              {joining ? 'Leaving…' : 'Leave Club'}
            </Button>
          ) : (
            <Button
              className="w-full rounded-full"
              onClick={joinClub}
              disabled={joining}
            >
              {joining ? 'Joining…' : 'Join Club'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Clickable card ───────────────────────────────────────────────────────────

function EventCard({ event: e, onClick }: { event: EventRow; onClick: () => void }) {
  const asClub = e as EventRow & { meeting_days?: string; meeting_time?: string; recurrence?: string; room?: string }
  const schedule = e.type === 'club'
    ? formatSchedule(asClub.meeting_days ?? '', asClub.meeting_time ?? '', asClub.recurrence ?? '')
    : null
  const fullLocation = [e.location, asClub.room].filter(Boolean).join(' · ')

  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)] text-left transition hover:scale-[1.01]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-foreground">{e.title}</h3>
        <span className="shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
          {e.type}
        </span>
      </div>
      {e.description && (
        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{e.description}</p>
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
    </button>
  )
}

// ─── Post / Edit form (used inside the dialog) ────────────────────────────────

function PostForm({
  kind, setKind,
  title, setTitle,
  desc, setDesc,
  loc, setLoc,
  room, setRoom,
  date, setDate,
  meetingDays, toggleDay,
  meetingTime, setMeetingTime,
  recurrence, setRecurrence,
  posting, onSubmit, isEditing,
}: {
  kind: 'event' | 'club'; setKind: (k: 'event' | 'club') => void
  title: string; setTitle: (v: string) => void
  desc: string; setDesc: (v: string) => void
  loc: string; setLoc: (v: string) => void
  room: string; setRoom: (v: string) => void
  date: string; setDate: (v: string) => void
  meetingDays: string[]; toggleDay: (d: string) => void
  meetingTime: string; setMeetingTime: (v: string) => void
  recurrence: Recurrence; setRecurrence: (v: Recurrence) => void
  posting: boolean; onSubmit: () => void; isEditing: boolean
}) {
  return (
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

      {/* Location + Room */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Location</Label>
          <Input value={loc} onChange={(e) => setLoc(e.target.value)} maxLength={120} placeholder="Trabant Center" />
        </div>
        <div className="space-y-1.5">
          <Label>Room</Label>
          <Input value={room} onChange={(e) => setRoom(e.target.value)} maxLength={80} placeholder="Room 209" />
        </div>
      </div>

      {/* Date & Time (events) / Start Date (clubs) */}
      <div className="space-y-1.5">
        <Label>{kind === 'event' ? 'Date & Time' : 'Start Date'}</Label>
        <Input
          type="datetime-local"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* Club-only: meeting schedule */}
      {kind === 'club' && (
        <>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Meeting Time</Label>
              <Input type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Recurrence</Label>
              <div className="flex flex-col gap-1.5">
                {RECURRENCE.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRecurrence(value)}
                    className={`rounded-full border px-3 py-1 text-sm text-left transition ${
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

      <Button onClick={onSubmit} disabled={!title.trim() || posting} className="w-full rounded-full">
        {posting ? (isEditing ? 'Saving…' : 'Posting…') : (isEditing ? 'Save Changes' : 'Publish')}
      </Button>
    </div>
  )
}
