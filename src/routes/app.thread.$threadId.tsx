import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send } from "lucide-react";
import { Avatar, Loader } from "./app.discover";

export const Route = createFileRoute("/app/thread/$threadId")({
  component: ThreadView,
});

type Msg = { id: string; sender_id: string; content: string; created_at: string };
type ProfileMini = { id: string; full_name: string };

function ThreadView() {
  const { threadId } = useParams({ from: "/app/thread/$threadId" });
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileMini>>({});
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadName, setThreadName] = useState("Chat");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    (async () => {
      const { data: thread } = await supabase.from("threads").select("kind, name").eq("id", threadId).maybeSingle();
      if (thread?.kind === "global") setThreadName("Global Chat");
      else if (thread?.name) setThreadName(thread.name);

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(200);
      setMessages((msgs as Msg[]) ?? []);

      const ids = Array.from(new Set([...(msgs ?? []).map((m) => m.sender_id)]));
      if (ids.length) {
        const { data: p } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        const map: Record<string, ProfileMini> = {};
        (p ?? []).forEach((pp) => (map[pp.id] = pp));
        setProfiles(map);

        // For 1:1 threads, set name as other person
        if (thread?.kind === "match") {
          const other = (p ?? []).find((pp) => pp.id !== user.id);
          if (other) setThreadName(other.full_name);
        }
      }
      setLoading(false);
    })();

    const ch = supabase
      .channel(`thread:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
        async (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (!profiles[m.sender_id]) {
            const { data: p } = await supabase.from("profiles").select("id, full_name").eq("id", m.sender_id).maybeSingle();
            if (p) setProfiles((prev) => ({ ...prev, [p.id]: p }));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [threadId, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim()) return;
    const content = text.trim().slice(0, 1000);
    setText("");
    await supabase.from("messages").insert({ thread_id: threadId, sender_id: user.id, content });
  };

  if (loading) return <Loader />;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Link to="/app/chats" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Avatar name={threadName} size={36} />
        <h1 className="font-semibold">{threadName}</h1>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">Say hi 👋</p>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
                    mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card text-card-foreground shadow-[var(--shadow-soft)]"
                  }`}>
                    {!mine && <p className="text-[10px] font-semibold opacity-70">{profiles[m.sender_id]?.full_name ?? "Someone"}</p>}
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-border bg-card p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…" maxLength={1000} />
        <Button type="submit" size="icon" disabled={!text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
