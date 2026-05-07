import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { GraduationCap, UserCog, ArrowLeft, ArrowRight, Sparkles, Check } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const INTERESTS = [
  "Cooking", "Hiking", "Gaming", "Music", "Sports", "Art", "Reading", "Movies",
  "Travel", "Photography", "Coding", "Dance", "Languages", "Coffee", "Fitness",
  "Volunteering", "Anime", "Board Games", "Fashion", "Politics",
];

const LANGUAGE_OPTIONS = ["English", "Spanish", "Portuguese", "Chinese", "Arabic", "French"];

// Map language name -> global thread id (matches migration)
const LANG_THREAD_IDS: Record<string, string> = {
  English: "00000000-0000-0000-0000-0000000000a1",
  Spanish: "00000000-0000-0000-0000-0000000000a2",
  Portuguese: "00000000-0000-0000-0000-0000000000a3",
  Chinese: "00000000-0000-0000-0000-0000000000a4",
  Arabic: "00000000-0000-0000-0000-0000000000a5",
  French: "00000000-0000-0000-0000-0000000000a6",
};

function Onboarding() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [role, setRole] = useState<"first_year" | "mentor">("first_year");
  const [homeCountry, setHomeCountry] = useState("");
  const university = "University of Delaware";
  const [year, setYear] = useState("");
  const [major, setMajor] = useState("");
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [otherLang, setOtherLang] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [funFact, setFunFact] = useState("");
  const [advice, setAdvice] = useState("");
  const [lookingFor, setLookingFor] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
    if (profile?.onboarded) navigate({ to: "/app/discover" });
  }, [user, profile, loading, navigate]);

  const toggleInterest = (i: string) =>
    setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  const toggleLang = (l: string) =>
    setSelectedLangs((prev) => (prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]));

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    const allLangs = [...selectedLangs];
    if (otherLang.trim()) allLangs.push(otherLang.trim());

    const { error } = await supabase.from("profiles").update({
      role,
      home_country: homeCountry,
      university,
      academic_year: year,
      major,
      languages: allLangs,
      interests,
      prompt_fun_fact: funFact,
      prompt_advice: advice,
      prompt_looking_for: lookingFor,
      onboarded: true,
    }).eq("id", user.id);

    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }

    await supabase.from("user_roles").upsert({ user_id: user.id, role }, { onConflict: "user_id,role" });

    // Auto-join language-based group chats
    const memberships = selectedLangs
      .map((l) => LANG_THREAD_IDS[l])
      .filter(Boolean)
      .map((thread_id) => ({ thread_id, user_id: user.id }));
    if (memberships.length) {
      await supabase.from("thread_members").upsert(memberships, { onConflict: "thread_id,user_id" });
    }

    await refreshProfile();
    setSaving(false);
    toast.success(t("onb.done"));
    navigate({ to: "/app/discover" });
  };

  const steps: Array<{ title: string; content: React.ReactNode; valid: boolean; hideBack?: boolean }> = [
    {
      title: t("onb.role.title"),
      content: (
        <div className="space-y-3">
          <RoleCard active={role === "first_year"} onClick={() => setRole("first_year")}
            icon={<GraduationCap className="h-6 w-6" />} title={t("onb.role.firstYear")} desc={t("onb.role.firstYearDesc")} />
          <RoleCard active={role === "mentor"} onClick={() => setRole("mentor")}
            icon={<UserCog className="h-6 w-6" />} title={t("onb.role.mentor")} desc={t("onb.role.mentorDesc")} />
        </div>
      ),
      valid: true,
    },
    {
      title: t("onb.about.title"),
      content: (
        <div className="space-y-4">
          <div>
            <Label>{t("onb.about.country")}</Label>
            <Input value={homeCountry} onChange={(e) => setHomeCountry(e.target.value)} placeholder="Brazil" className="mt-1.5" />
          </div>
          <div>
            <Label>{t("onb.about.university")}</Label>
            <Input value={university} disabled readOnly className="mt-1.5 bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t("onb.about.year")}</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder={t("onb.about.year.select")} /></SelectTrigger>
                <SelectContent>
                  {["Freshman","Sophomore","Junior","Senior","Graduate"].map((y) => (
                    <SelectItem key={y} value={y}>{t(`year.${y}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("onb.about.major")}</Label>
              <Input value={major} onChange={(e) => setMajor(e.target.value)} placeholder="CS" className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label>{t("onb.about.languages")}</Label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((l) => {
                const on = selectedLangs.includes(l);
                return (
                  <button key={l} type="button" onClick={() => toggleLang(l)}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition ${
                      on ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
                    }`}>
                    {on && <Check className="h-3.5 w-3.5" />} {l}
                  </button>
                );
              })}
            </div>
            <Input value={otherLang} onChange={(e) => setOtherLang(e.target.value)}
              placeholder={t("onb.about.languagesOther")} className="mt-2" />
          </div>
        </div>
      ),
      valid: homeCountry.length > 0 && (selectedLangs.length > 0 || otherLang.trim().length > 0),
    },
    {
      title: t("onb.build.title"),
      content: (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-12 w-12" />
          </div>
          <h2 className="mt-6 text-3xl font-bold">{t("onb.build.heading")}</h2>
          <p className="mt-3 max-w-xs text-muted-foreground">{t("onb.build.subtitle")}</p>
        </div>
      ),
      valid: true,
    },
    {
      title: t("onb.interests.title"),
      content: (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">{t("onb.interests.subtitle")}</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <button key={i} type="button" onClick={() => toggleInterest(i)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                  interests.includes(i) ? "border-transparent bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"
                }`}>
                {i}
              </button>
            ))}
          </div>
        </div>
      ),
      valid: interests.length > 0,
    },
    {
      title: t("onb.prompts.fun"),
      content: (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">{t("onb.prompts.funHint")}</p>
          <Textarea value={funFact} onChange={(e) => setFunFact(e.target.value)} rows={4} placeholder="I once…" />
        </div>
      ),
      valid: true,
    },
    {
      title: t("onb.prompts.advice"),
      content: (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">{t("onb.prompts.adviceHint")}</p>
          <Textarea value={advice} onChange={(e) => setAdvice(e.target.value)} rows={4} placeholder="The best advice…" />
        </div>
      ),
      valid: true,
    },
    {
      title: role === "mentor" ? t("onb.prompts.lookingMentees") : t("onb.prompts.lookingMentor"),
      content: (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">{t("onb.prompts.lookingHint")}</p>
          <Textarea value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} rows={4} />
        </div>
      ),
      valid: true,
    },
  ];

  const cur = steps[step];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-md flex-col px-6 pb-10 pt-8">
        <div className="mb-6 flex gap-1.5">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>
        <h1 className="text-2xl font-bold">{cur.title}</h1>
        <div className="mt-6">{cur.content}</div>
        <div className="mt-10 flex gap-3">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" /> {t("common.back")}
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!cur.valid} className="flex-1">
              {t("common.next")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={saving} className="flex-1">
              {saving ? t("common.saving") : t("common.finish")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  active, onClick, icon, title, desc,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex w-full items-start gap-4 rounded-2xl border-2 p-4 text-left transition ${
        active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
      }`}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}
