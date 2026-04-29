import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart, X, Sparkles, Check, MapPin, GraduationCap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/discover")({
  component: Discover,
});

type Profile = {
  id: string;
  full_name: string;
  home_country: string;
  university: string;
  academic_year: string;
  major: string;
  languages: string[];
  interests: string[];
  prompt_fun_fact: string;
  prompt_advice: string;
  prompt_looking_for: string;
  photo_url: string;
};

function Discover() {
  const { profile } = useAuth();
  if (profile?.role === "mentor") return <MentorRequests />;
  return <MenteeSwipe />;
}

function MenteeSwipe() {
  const { user } = useAuth();
  const [mentors, setMentors] = useState<Profile[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: swiped } = await supabase.from("swipes").select("target_id").eq("swiper_id", user.id);
      const swipedIds = (swiped ?? []).map((s) => s.target_id);
      let q = supabase
        .from("profiles")
        .select("*")
        .eq("role", "mentor")
        .eq("discoverable", true)
        .eq("onboarded", true)
        .neq("id", user.id);
      if (swipedIds.length) q = q.not("id", "in", `(${swipedIds.join(",")})`);
      const { data } = await q.limit(50);
      setMentors((data as Profile[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const swipe = async (liked: boolean) => {
    if (!user) return;
    const m = mentors[idx];
    if (!m) return;
    await supabase.from("swipes").insert({ swiper_id: user.id, target_id: m.id, liked });
    if (liked) {
      await supabase.from("match_requests").insert({ mentee_id: user.id, mentor_id: m.id });
      toast.success(`Request sent to ${m.full_name.split(" ")[0]}!`);
    }
    setIdx((i) => i + 1);
  };

  if (loading) {
    return <Loader />;
  }

  const current = mentors[idx];

  return (
    <div className="px-5 pb-6 pt-6">
      <Header title="Discover" subtitle="Swipe through mentors" />
      {!current ? (
        <EmptyState
          icon={<Sparkles className="h-8 w-8" />}
          title="You're all caught up"
          desc="Check back later — more mentors join every week."
        />
      ) : (
        <>
          <MentorCard p={current} />
          <div className="mt-6 flex items-center justify-center gap-6">
            <button
              onClick={() => swipe(false)}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-border bg-card text-muted-foreground shadow-[var(--shadow-soft)] transition hover:scale-105 hover:border-destructive hover:text-destructive"
            >
              <X className="h-7 w-7" />
            </button>
            <button
              onClick={() => swipe(true)}
              className="flex h-20 w-20 items-center justify-center rounded-full text-primary-foreground shadow-[var(--shadow-card)] transition hover:scale-105"
              style={{ background: "var(--gradient-warm)" }}
            >
              <Heart className="h-9 w-9" fill="currentColor" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MentorCard({ p }: { p: Profile }) {
  const initials = p.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-[var(--shadow-card)]">
      <div
        className="flex h-56 items-center justify-center text-6xl font-bold text-primary-foreground"
        style={{ background: "var(--gradient-warm)" }}
      >
        {p.photo_url ? (
          <img src={p.photo_url} alt={p.full_name} className="h-full w-full object-cover" />
        ) : (
          <span>{initials || "?"}</span>
        )}
      </div>
      <div className="space-y-4 p-5">
        <div>
          <h2 className="text-2xl font-bold">{p.full_name}</h2>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {p.home_country && (
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{p.home_country}</span>
            )}
            {p.academic_year && (
              <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />{p.academic_year}{p.major ? ` · ${p.major}` : ""}</span>
            )}
          </div>
        </div>

        {p.interests.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {p.interests.slice(0, 8).map((i) => (
              <span key={i} className="rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground">{i}</span>
            ))}
          </div>
        )}

        {p.prompt_fun_fact && (
          <Prompt label="Fun fact" text={p.prompt_fun_fact} />
        )}
        {p.prompt_advice && (
          <Prompt label="Best advice I got" text={p.prompt_advice} />
        )}
        {p.prompt_looking_for && (
          <Prompt label="Mentees I'd love to meet" text={p.prompt_looking_for} />
        )}
        {p.languages.length > 0 && (
          <p className="text-xs text-muted-foreground">Speaks {p.languages.join(", ")}</p>
        )}
      </div>
    </div>
  );
}

function Prompt({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl bg-muted/60 p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm">{text}</p>
    </div>
  );
}

function MentorRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Array<{ id: string; mentee_id: string; status: string; profile: Profile | null }>>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("match_requests")
      .select("id, mentee_id, status")
      .eq("mentor_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    const ids = (data ?? []).map((r) => r.mentee_id);
    let profiles: Profile[] = [];
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("*").in("id", ids);
      profiles = (p as Profile[]) ?? [];
    }
    setRequests(
      (data ?? []).map((r) => ({ ...r, profile: profiles.find((pp) => pp.id === r.mentee_id) ?? null }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const respond = async (req: { id: string; mentee_id: string }, accept: boolean) => {
    if (!user) return;
    if (accept) {
      // Create thread & members
      const { data: thread } = await supabase
        .from("threads")
        .insert({ kind: "match", created_by: user.id })
        .select()
        .single();
      if (thread) {
        await supabase.from("thread_members").insert([
          { thread_id: thread.id, user_id: user.id },
          { thread_id: thread.id, user_id: req.mentee_id },
        ]);
        await supabase.from("match_requests").update({ status: "accepted", thread_id: thread.id }).eq("id", req.id);
      }
      toast.success("Match accepted! Say hi in Chats.");
    } else {
      await supabase.from("match_requests").update({ status: "declined" }).eq("id", req.id);
    }
    load();
  };

  if (loading) return <Loader />;

  return (
    <div className="px-5 pb-6 pt-6">
      <Header title="Requests" subtitle="Mentees who want to connect" />
      {requests.length === 0 ? (
        <EmptyState icon={<Heart className="h-8 w-8" />} title="No requests yet" desc="When a mentee likes your profile, they'll show up here." />
      ) : (
        <div className="space-y-4">
          {requests.map((r) =>
            r.profile ? (
              <div key={r.id} className="rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
                <div className="flex items-center gap-3">
                  <Avatar name={r.profile.full_name} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold">{r.profile.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.profile.home_country} · {r.profile.major || r.profile.academic_year}
                    </p>
                  </div>
                </div>
                {r.profile.prompt_looking_for && (
                  <p className="mt-3 rounded-xl bg-muted/60 p-3 text-sm">"{r.profile.prompt_looking_for}"</p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button onClick={() => respond(r, false)} variant="outline" className="flex-1">
                    <X className="mr-1 h-4 w-4" /> Decline
                  </Button>
                  <Button onClick={() => respond(r, true)} className="flex-1">
                    <Check className="mr-1 h-4 w-4" /> Accept
                  </Button>
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-card p-10 text-center shadow-[var(--shadow-soft)]">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-primary-foreground"
      style={{ width: size, height: size, background: "var(--gradient-warm)", fontSize: size * 0.4 }}
    >
      {initials || "?"}
    </div>
  );
}

export function Loader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
