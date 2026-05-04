import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, MapPin, Plus } from "lucide-react";
import { Header, EmptyState, Loader } from "./app.discover";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/app/events")({
  component: Events,
});

type EventRow = {
  id: string;
  kind: "event" | "club";
  title: string;
  description: string;
  location: string;
  starts_at: string | null;
  created_by: string | null;
};

function Events() {
  const { user } = useAuth();
  const { t } = useT();
  const [filter, setFilter] = useState<"event" | "club">("event");
  const [items, setItems] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [loc, setLoc] = useState("");
  const [date, setDate] = useState("");
  const [kind, setKind] = useState<"event" | "club">("event");

  const load = async () => {
    const { data } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    setItems((data as EventRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!user || !title.trim()) return;
    const { error } = await supabase.from("events").insert({
      title: title.trim().slice(0, 120),
      description: desc.trim().slice(0, 1000),
      location: loc.trim().slice(0, 120),
      starts_at: date ? new Date(date).toISOString() : null,
      kind,
      created_by: user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(kind === "event" ? t("events.postedEvent") : t("events.postedClub"));
    setOpen(false);
    setTitle(""); setDesc(""); setLoc(""); setDate(""); setKind("event");
    load();
  };

  if (loading) return <Loader />;

  const filtered = items.filter((i) => i.kind === filter);

  return (
    <div className="px-5 pb-6 pt-6">
      <div className="flex items-start justify-between">
        <Header title={t("events.title")} subtitle={t("events.subtitle")} />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> {t("common.post")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("events.post")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button type="button" variant={kind === "event" ? "default" : "outline"} onClick={() => setKind("event")} className="flex-1">{t("events.event")}</Button>
                <Button type="button" variant={kind === "club" ? "default" : "outline"} onClick={() => setKind("club")} className="flex-1">{t("events.club")}</Button>
              </div>
              <div><Label>{t("events.field.title")}</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mt-1.5" /></div>
              <div><Label>{t("events.field.desc")}</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} maxLength={1000} className="mt-1.5" /></div>
              <div><Label>{t("events.field.location")}</Label><Input value={loc} onChange={(e) => setLoc(e.target.value)} maxLength={120} className="mt-1.5" /></div>
              {kind === "event" && (
                <div><Label>{t("events.field.datetime")}</Label><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5" /></div>
              )}
              <Button onClick={create} disabled={!title.trim()} className="w-full">{t("common.publish")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4 inline-flex rounded-full bg-muted p-1">
        <button onClick={() => setFilter("event")} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${filter === "event" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{t("events.tab.events")}</button>
        <button onClick={() => setFilter("club")} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${filter === "club" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>{t("events.tab.clubs")}</button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-8 w-8" />}
          title={filter === "event" ? t("events.empty.events") : t("events.empty.clubs")}
          desc={t("events.empty.desc")}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <div key={e.id} className="rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{e.title}</h3>
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent-foreground">
                  {e.kind}
                </span>
              </div>
              {e.description && <p className="mt-2 text-sm text-muted-foreground">{e.description}</p>}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {e.starts_at && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(e.starts_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                )}
                {e.location && (
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{e.location}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
