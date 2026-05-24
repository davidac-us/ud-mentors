import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Globe, Languages, Plus, Users } from 'lucide-react'
import { Header, Avatar, Loader } from './app.discover'
import { toast } from 'sonner'
import type { CommunityRoom } from '@/integrations/supabase/types'

export const Route = createFileRoute('/app/community')({
  component: CommunityTab,
})

// Language → room language_code mapping
const LANG_CODE: Record<string, string> = {
  English: 'en', Spanish: 'es', Portuguese: 'pt',
  Chinese: 'zh', Arabic: 'ar', French: 'fr',
}

const LANG_FLAG: Record<string, string> = {
  en: '🇬🇧', es: '🇪🇸', pt: '🇵🇹', zh: '🇨🇳', ar: '🇸🇦', fr: '🇫🇷',
}

function CommunityTab() {
  const { profile } = useAuth()
  const [globalRoom, setGlobalRoom] = useState<CommunityRoom | null>(null)
  const [langRooms, setLangRooms] = useState<CommunityRoom[]>([])
  const [groupRooms, setGroupRooms] = useState<CommunityRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [activeRoom, setActiveRoom] = useState<CommunityRoom | null>(null)

  // Group creation state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string }>>([])
  const [picked, setPicked] = useState<Array<{ id: string; name: string }>>([])
  const [creating, setCreating] = useState(false)

  const load = async () => {
    if (!profile) return

    // Global room
    const { data: global } = await supabase
      .from('community_rooms')
      .select('*')
      .eq('type', 'global')
      .single()
    setGlobalRoom(global)

    // Language rooms — fetch for user's languages, then check >= 2 users
    const userLangCodes = profile.languages
      .map((l) => LANG_CODE[l])
      .filter(Boolean)

    if (userLangCodes.length > 0) {
      const [{ data: rooms }, { data: langData }] = await Promise.all([
        supabase.from('community_rooms').select('*').eq('type', 'language').in('language_code', userLangCodes),
        supabase.from('profile_languages').select('language, profile_id').in('language', profile.languages),
      ])

      // Count users per language
      const langUserCount: Record<string, Set<string>> = {}
      for (const row of langData ?? []) {
        ;(langUserCount[row.language] ??= new Set()).add(row.profile_id)
      }
      const activeLangCodes = new Set(
        Object.entries(langUserCount)
          .filter(([, set]) => set.size >= 2)
          .map(([lang]) => LANG_CODE[lang])
          .filter(Boolean),
      )

      setLangRooms((rooms ?? []).filter((r) => r.language_code && activeLangCodes.has(r.language_code)))
    }

    // Group rooms the user is a member of
    const { data: memberRows } = await supabase
      .from('community_room_members')
      .select('room_id')
      .eq('profile_id', profile.id)

    const groupIds = memberRows?.map((r) => r.room_id) ?? []
    if (groupIds.length > 0) {
      const { data: groups } = await supabase
        .from('community_rooms')
        .select('*')
        .eq('type', 'group')
        .in('id', groupIds)
      setGroupRooms(groups ?? [])
    } else {
      setGroupRooms([])
    }

    setLoading(false)
  }

  useEffect(() => { load() }, [profile?.id])

  const searchProfiles = async (q: string) => {
    setSearch(q)
    if (q.length < 2) { setSearchResults([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, name')
      .ilike('name', `%${q}%`)
      .neq('id', profile?.id ?? '')
      .limit(8)
    setSearchResults(data?.map((p) => ({ id: p.id, name: p.name })) ?? [])
  }

  const createGroup = async () => {
    if (!profile || !groupName.trim()) return
    setCreating(true)

    const { data: room, error } = await supabase
      .from('community_rooms')
      .insert({ type: 'group', name: groupName.trim().slice(0, 60) })
      .select()
      .single()

    if (error || !room) {
      toast.error(error?.message ?? 'Failed to create group.')
      setCreating(false)
      return
    }

    const memberRows = [
      { room_id: room.id, profile_id: profile.id },
      ...picked.map((p) => ({ room_id: room.id, profile_id: p.id })),
    ]
    await supabase.from('community_room_members').insert(memberRows)

    toast.success('Group created!')
    setDialogOpen(false)
    setGroupName('')
    setPicked([])
    setSearch('')
    setSearchResults([])
    setCreating(false)
    load()
  }

  if (loading) return <Loader />

  if (activeRoom) {
    return (
      <RoomChat
        room={activeRoom}
        onBack={() => setActiveRoom(null)}
      />
    )
  }

  return (
    <div className="px-5 pb-6 pt-6">
      <Header title="Community" subtitle="Connect with everyone at UD" />

      {/* Global Chat */}
      {globalRoom && (
        <button
          onClick={() => setActiveRoom(globalRoom)}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl p-4 text-primary-foreground shadow-[var(--shadow-card)] transition hover:scale-[1.01]"
          style={{ background: 'var(--gradient-cool)' }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
            <Globe className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="font-semibold">Global Chat</p>
            <p className="text-sm text-white/80">Everyone&apos;s here. Say hi.</p>
          </div>
        </button>
      )}

      {/* Language Chats */}
      {langRooms.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Languages className="h-4 w-4" /> Language Chats
          </div>
          <div className="space-y-2">
            {langRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setActiveRoom(room)}
                className="flex w-full items-center gap-3 rounded-2xl bg-card p-3.5 shadow-[var(--shadow-soft)] transition hover:scale-[1.01] text-left"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/20 text-2xl">
                  {room.language_code && LANG_FLAG[room.language_code]}
                </div>
                <p className="font-semibold text-foreground">{room.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Group Chats */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Group Chats</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-full">
                <Plus className="mr-1 h-4 w-4" /> New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Group Chat</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={60}
                />
                <div>
                  <Input
                    placeholder="Search people by name…"
                    value={search}
                    onChange={(e) => searchProfiles(e.target.value)}
                  />
                  {searchResults.length > 0 && (
                    <div className="mt-2 space-y-1 rounded-xl border border-border bg-card p-1">
                      {searchResults.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            if (!picked.some((p) => p.id === r.id)) setPicked([...picked, r])
                            setSearch('')
                            setSearchResults([])
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent"
                        >
                          <Avatar name={r.name} size={28} /> {r.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {picked.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {picked.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setPicked(picked.filter((x) => x.id !== p.id))}
                          className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
                        >
                          {p.name} ✕
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  onClick={createGroup}
                  disabled={!groupName.trim() || creating}
                  className="w-full rounded-full"
                >
                  {creating ? 'Creating…' : 'Create Group'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {groupRooms.length === 0 ? (
          <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
            No group chats yet. Create one to get started!
          </div>
        ) : (
          <div className="space-y-2">
            {groupRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setActiveRoom(room)}
                className="flex w-full items-center gap-3 rounded-2xl bg-card p-3.5 shadow-[var(--shadow-soft)] transition hover:scale-[1.01] text-left"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary/20 text-secondary">
                  <Users className="h-5 w-5" />
                </div>
                <p className="font-semibold text-foreground">{room.name}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Room chat view ─────────────────────────────────────────────────────────

type RoomMessage = { id: string; sender_id: string; content: string; created_at: string }

function RoomChat({ room, onBack }: { room: CommunityRoom; onBack: () => void }) {
  const { profile } = useAuth()
  const [messages, setMessages] = useState<RoomMessage[]>([])
  const [senderNames, setSenderNames] = useState<Record<string, string>>({})
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    supabase
      .from('community_messages')
      .select('id, sender_id, content, created_at')
      .eq('room_id', room.id)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(async ({ data }) => {
        const msgs = (data as RoomMessage[]) ?? []
        setMessages(msgs)

        const ids = [...new Set(msgs.map((m) => m.sender_id))]
        if (ids.length) {
          const { data: senders } = await supabase.from('profiles').select('id, name').in('id', ids)
          const map: Record<string, string> = {}
          for (const s of senders ?? []) map[s.id] = s.name
          setSenderNames(map)
        }
      })

    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'community_messages', filter: `room_id=eq.${room.id}` },
        async (payload) => {
          const msg = payload.new as RoomMessage
          setMessages((prev) => [...prev, msg])
          if (!senderNames[msg.sender_id]) {
            const { data } = await supabase.from('profiles').select('name').eq('id', msg.sender_id).single()
            if (data) setSenderNames((prev) => ({ ...prev, [msg.sender_id]: data.name }))
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [room.id])

  const send = async () => {
    if (!profile || !input.trim() || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')
    await supabase.from('community_messages').insert({ room_id: room.id, sender_id: profile.id, content })
    setSending(false)
  }

  return (
    <div className="flex flex-col h-screen pb-20">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4 bg-card">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          ←
        </button>
        <span className="font-semibold text-foreground">{room.name}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground pt-8">
            Be the first to say something!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === profile?.id
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} gap-2`}>
              {!isMe && <Avatar name={senderNames[msg.sender_id] ?? '?'} size={28} />}
              <div className={`max-w-[72%] ${!isMe && 'pt-1'}`}>
                {!isMe && (
                  <p className="mb-1 text-[11px] text-muted-foreground">
                    {senderNames[msg.sender_id] ?? '…'}
                  </p>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-card text-foreground rounded-bl-sm shadow-[var(--shadow-soft)]'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-border px-5 py-3 bg-card flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Message…"
          className="flex-1 rounded-full bg-muted px-4 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  )
}
