import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/integrations/supabase/client'
import { MessageCircle } from 'lucide-react'
import { Header, EmptyState, Avatar, Loader } from './app.discover'

export const Route = createFileRoute('/app/chats')({
  component: ChatsTab,
})

type MatchRow = {
  id: string
  mentee_id: string
  mentor_id: string
  other_name: string
  other_role: string
}

function ChatsTab() {
  const { profile } = useAuth()
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeMatch, setActiveMatch] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const { data } = await supabase
        .from('matches')
        .select('id, mentee_id, mentor_id')
        .eq('status', 'matched')
        .or(`mentee_id.eq.${profile.id},mentor_id.eq.${profile.id}`)
        .order('created_at', { ascending: false })

      if (!data?.length) {
        setMatches([])
        setLoading(false)
        return
      }

      const otherIds = data.map((m) =>
        m.mentee_id === profile.id ? m.mentor_id : m.mentee_id,
      )

      const { data: others } = await supabase
        .from('profiles')
        .select('id, name, role')
        .in('id', otherIds)

      setMatches(
        data.map((m) => {
          const otherId = m.mentee_id === profile.id ? m.mentor_id : m.mentee_id
          const other = others?.find((p) => p.id === otherId)
          return {
            id: m.id,
            mentee_id: m.mentee_id,
            mentor_id: m.mentor_id,
            other_name: other?.name ?? 'Unknown',
            other_role: other?.role ?? '',
          }
        }),
      )
      setLoading(false)
    })()
  }, [profile?.id])

  if (loading) return <Loader />

  if (activeMatch) {
    const match = matches.find((m) => m.id === activeMatch)
    if (match) {
      return (
        <ChatView
          matchId={match.id}
          otherName={match.other_name}
          onBack={() => setActiveMatch(null)}
        />
      )
    }
  }

  return (
    <div className="px-5 pb-6 pt-6">
      <Header title="Chats" />
      {matches.length === 0 ? (
        <EmptyState
          icon={<MessageCircle className="h-8 w-8" />}
          title="No chats yet"
          desc="Once you match with a mentor, the conversation will appear here."
        />
      ) : (
        <div className="space-y-2">
          {matches.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveMatch(m.id)}
              className="flex w-full items-center gap-3 rounded-2xl bg-card p-3.5 shadow-[var(--shadow-soft)] transition hover:scale-[1.01] text-left"
            >
              <Avatar name={m.other_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{m.other_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{m.other_role}</p>
              </div>
              <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Inline chat view ────────────────────────────────────────────────────────

type ChatMessage = {
  id: string
  sender_id: string
  content: string
  created_at: string
}

function ChatView({
  matchId,
  otherName,
  onBack,
}: {
  matchId: string
  otherName: string
  onBack: () => void
}) {
  const { profile } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    // Fetch existing messages
    supabase
      .from('messages')
      .select('id, sender_id, content, created_at')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages((data as ChatMessage[]) ?? []))

    // Real-time subscription
    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as ChatMessage]),
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId])

  const send = async () => {
    if (!profile || !input.trim() || sending) return
    setSending(true)
    const content = input.trim()
    setInput('')
    await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: profile.id,
      content,
    })
    setSending(false)
  }

  return (
    <div className="flex flex-col h-screen pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-4 bg-card">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          ←
        </button>
        <Avatar name={otherName} size={36} />
        <span className="font-semibold text-foreground">{otherName}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground pt-8">
            Say hello to start the conversation!
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === profile?.id
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  isMe
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card text-foreground rounded-bl-sm shadow-[var(--shadow-soft)]'
                }`}
              >
                {msg.content}
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
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
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 transition-opacity"
        >
          Send
        </button>
      </div>
    </div>
  )
}
