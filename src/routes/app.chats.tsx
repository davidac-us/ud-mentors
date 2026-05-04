import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Header, EmptyState, Avatar, Loader } from "./app.discover";

export const Route = createFileRoute("/app/chats")({
  component: ChatsList,
});

type Row = {
  id: string;
  thread_id: string | null;
  mentee_id: string;
  mentor_id: string;
  other: { id: string; full_name: string; role: string } | null;
};

function ChatsList() {
  const { user } = useAuth();
  const { t } = useT();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: matches } = await supabase
        .from("match_requests")
        .select("id, thread_id, mentee_id, mentor_id")
        .eq("status", "accepted")
        .or(`mentee_id.eq.${user.id},mentor_id.eq.${user.id}`)
        .not("thread_id", "is", null);

      const otherIds = (matches ?? []).map((m) => (m.mentee_id === user.id ? m.mentor_id : m.mentee_id));
      let profiles: Array<{ id: string; full_name: string; role: string }> = [];
      if (otherIds.length) {
        const { data: p } = await supabase.from("profiles").select("id, full_name, role").in("id", otherIds);
        profiles = p ?? [];
      }
      setRows(
        (matches ?? []).map((m) => {
          const otherId = m.mentee_id === user.id ? m.mentor_id : m.mentee_id;
          return { ...m, other: profiles.find((pp) => pp.id === otherId) ?? null };
        })
      );
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <Loader />;

  return (
    <div className="px-5 pb-6 pt-6">
      <Header title={t("chats.title")} subtitle={t("chats.subtitle")} />
      {rows.length === 0 ? (
        <EmptyState
          icon={<MessageCircle className="h-8 w-8" />}
          title={t("chats.empty.title")}
          desc={t("chats.empty.desc")}
        />
      ) : (
        <div className="space-y-2">
          {rows.map((r) =>
            r.other && r.thread_id ? (
              <Link
                key={r.id}
                to="/app/thread/$threadId"
                params={{ threadId: r.thread_id }}
                className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-[var(--shadow-soft)] transition hover:scale-[1.01]"
              >
                <Avatar name={r.other.full_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.other.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.other.role === "mentor" ? t("chats.mentor") : t("chats.mentee")}
                  </p>
                </div>
              </Link>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
