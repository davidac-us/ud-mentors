import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Header, Avatar, Loader } from "./app.discover";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("");
  const [university, setUniversity] = useState("");
  const [year, setYear] = useState("");
  const [major, setMajor] = useState("");
  const [languages, setLanguages] = useState("");
  const [funFact, setFunFact] = useState("");
  const [advice, setAdvice] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [discoverable, setDiscoverable] = useState(true);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setCountry(profile.home_country);
    setUniversity(profile.university);
    setYear(profile.academic_year);
    setMajor(profile.major);
    setLanguages(profile.languages.join(", "));
    setFunFact(profile.prompt_fun_fact);
    setAdvice(profile.prompt_advice);
    setLookingFor(profile.prompt_looking_for);
    setDiscoverable(profile.discoverable);
  }, [profile]);

  if (!profile || !user) return <Loader />;

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName.slice(0, 80),
      home_country: country, university, academic_year: year, major,
      languages: languages.split(",").map((l) => l.trim()).filter(Boolean),
      prompt_fun_fact: funFact, prompt_advice: advice, prompt_looking_for: lookingFor,
      discoverable,
    }).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("profile.updated"));
    refreshProfile();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="px-5 pb-10 pt-6">
      <Header title={t("profile.title")} />
      <div className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
        <Avatar name={profile.full_name} size={64} />
        <div>
          <p className="font-semibold">{profile.full_name}</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {profile.role === "mentor" ? t("profile.mentor") : t("profile.firstYear")}
          </p>
        </div>
      </div>

      {profile.role === "mentor" && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
          <div>
            <p className="font-medium">{t("profile.discoverable")}</p>
            <p className="text-xs text-muted-foreground">{t("profile.discoverableDesc")}</p>
          </div>
          <Switch checked={discoverable} onCheckedChange={setDiscoverable} />
        </div>
      )}

      <div className="mt-4 space-y-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
        <div><Label>{t("profile.fullName")}</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" /></div>
        <div><Label>{t("profile.country")}</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1.5" /></div>
        <div><Label>{t("profile.university")}</Label><Input value={university} onChange={(e) => setUniversity(e.target.value)} className="mt-1.5" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>{t("profile.year")}</Label><Input value={year} onChange={(e) => setYear(e.target.value)} className="mt-1.5" /></div>
          <div><Label>{t("profile.major")}</Label><Input value={major} onChange={(e) => setMajor(e.target.value)} className="mt-1.5" /></div>
        </div>
        <div><Label>{t("profile.languages")}</Label><Input value={languages} onChange={(e) => setLanguages(e.target.value)} className="mt-1.5" placeholder={t("profile.languagesPh")} /></div>
      </div>

      <div className="mt-4 space-y-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
        <div><Label>{t("profile.fun")}</Label><Textarea value={funFact} onChange={(e) => setFunFact(e.target.value)} rows={2} className="mt-1.5" /></div>
        <div><Label>{t("profile.advice")}</Label><Textarea value={advice} onChange={(e) => setAdvice(e.target.value)} rows={2} className="mt-1.5" /></div>
        <div><Label>{profile.role === "mentor" ? t("profile.lookingMentees") : t("profile.lookingMentor")}</Label>
          <Textarea value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} rows={2} className="mt-1.5" /></div>
      </div>

      <Button onClick={save} disabled={saving} size="lg" className="mt-5 w-full">
        {saving ? t("common.saving") : t("common.save")}
      </Button>

      <Button onClick={handleSignOut} variant="outline" size="lg" className="mt-3 w-full">
        <LogOut className="mr-2 h-4 w-4" /> {t("common.logout")}
      </Button>
    </div>
  );
}
