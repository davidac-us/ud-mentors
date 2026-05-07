import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Globe, Languages, Plus, Users } from "lucide-react";

const LANG_THREADS: Array<{ id: string; name: string; flag: string }> = [
  { id: "00000000-0000-0000-0000-0000000000a1", name: "English", flag: "🇬🇧" },
  { id: "00000000-0000-0000-0000-0000000000a2", name: "Spanish", flag: "🇪🇸" },
  { id: "00000000-0000-0000-0000-0000000000a3", name: "Portuguese", flag: "🇵🇹" },
  { id: "00000000-0000-0000-0000-0000000000a4", name: "Chinese", flag: "🇨🇳" },
  { id: "00000000-0000-0000-0000-0000000000a5", name: "Arabic", flag: "🇸🇦" },
  { id: "00000000-0000-0000-0000-0000000000a6", name: "French", flag: "🇫🇷" },
];
import { Header, Avatar, Loader } from "./app.discover";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/app/community")({
  component: Community,
});

const GLOBAL_ID = "00000000-0000-0000-0000-000000000001";

function Community() {
  const { user, profile } = useAuth();
  const { t } = useT();
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; full_name: string }>>([]);
  const [picked, setPicked] = useState<Array<{ id: string; full_name: string }>>([]);

  const load = async () => {
    if (!user) return;
    const { data: members } = await supabase.from("thread_members").select("thread_id").eq("user_id", user.id);
    const ids = (members ?? []).map((m) => m.thread_id);
    if (ids.length) {
      const { data: t } = await supabase
        .from("threads")
        .select("id, name")
        .in("id", ids)
        .eq("kind", "group");
      setGroups((t ?? []).map((x) => ({ id: x.id, name: x.name ?? "Group" })));
    } else {
      setGroups([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const search = async (q: string) => {
    setEmailQuery(q);
    if (q.length < 2) { setResults([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .ilike("full_name", `%${q}%`)
      .neq("id", user!.id)
      .limit(8);
    setResults(data ?? []);
  };

  const createGroup = async () => {
    if (!user || !newName.trim()) return;
    const { data: thread, error } = await supabase
      .from("threads")
      .insert({ kind: "group", name: newName.trim().slice(0, 60), created_by: user.id })
      .select()
      .single();
    if (error || !thread) { toast.error(error?.message ?? "Failed"); return; }
    const memberRows = [{ thread_id: thread.id, user_id: user.id }, ...picked.map((p) => ({ thread_id: thread.id, user_id: p.id }))];
    await supabase.from("thread_members").insert(memberRows);
    toast.success(t("community.created"));
    setOpen(false);
    setNewName(""); setPicked([]); setEmailQuery(""); setResults([]);
    load();
  };

  if (loading) return <Loader />;

  return (
    <div className="px-5 pb-6 pt-6">
      <Header title={t("community.title")} subtitle={t("community.subtitle")} />

      <Link
        to="/app/thread/$threadId"
        params={{ threadId: GLOBAL_ID }}
        className="mb-4 flex items-center gap-3 rounded-2xl p-4 text-primary-foreground shadow-[var(--shadow-card)] transition hover:scale-[1.01]"
        style={{ background: "var(--gradient-cool)" }}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
          <Globe className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold">{t("community.global")}</p>
          <p className="text-sm text-white/80">{t("community.globalDesc")}</p>
        </div>
      </Link>

      {(() => {
        const userLangs = (profile?.languages ?? []).map((l) => l.toLowerCase());
        const myLangChats = LANG_THREADS.filter((lt) => userLangs.includes(lt.name.toLowerCase()));
        if (myLangChats.length === 0) return null;
        return (
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <Languages className="h-4 w-4" /> {t("community.langChats")}
            </div>
            <div className="space-y-2">
              {myLangChats.map((lt) => (
                <Link
                  key={lt.id}
                  to="/app/thread/$threadId"
                  params={{ threadId: lt.id }}
                  className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-[var(--shadow-soft)] transition hover:scale-[1.01]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-2xl">
                    {lt.flag}
                  </div>
                  <p className="font-semibold">{lt.name} Chat</p>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="mb-3 mt-6 flex items-center justify-between">
        <h2 className="font-semibold">{t("community.groups")}</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" /> {t("common.new")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("community.newGroup")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder={t("community.groupName")} value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={60} />
              <div>
                <Input placeholder={t("community.searchMembers")} value={emailQuery} onChange={(e) => search(e.target.value)} />
                {results.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {results.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => {
                          if (!picked.some((p) => p.id === r.id)) setPicked([...picked, r]);
                          setEmailQuery(""); setResults([]);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm hover:bg-accent"
                      >
                        <Avatar name={r.full_name} size={28} /> {r.full_name}
                      </button>
                    ))}
                  </div>
                )}
                {picked.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {picked.map((p) => (
                      <button key={p.id} onClick={() => setPicked(picked.filter((x) => x.id !== p.id))}
                        className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                        {p.full_name} ✕
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={createGroup} disabled={!newName.trim()} className="w-full">{t("community.createGroup")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
          {t("community.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => (
            <Link
              key={g.id}
              to="/app/thread/$threadId"
              params={{ threadId: g.id }}
              className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-[var(--shadow-soft)] transition hover:scale-[1.01]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <Users className="h-5 w-5" />
              </div>
              <p className="font-semibold">{g.name}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
