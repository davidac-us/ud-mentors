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
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, user, refreshProfile, signOut } = useAuth();
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
    toast.success("Profile updated");
    refreshProfile();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="px-5 pb-10 pt-6">
      <Header title="Profile" />
      <div className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
        <Avatar name={profile.full_name} size={64} />
        <div>
          <p className="font-semibold">{profile.full_name}</p>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {profile.role === "mentor" ? "Mentor" : "First-year"}
          </p>
        </div>
      </div>

      {profile.role === "mentor" && (
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
          <div>
            <p className="font-medium">Discoverable</p>
            <p className="text-xs text-muted-foreground">Show me to first-years</p>
          </div>
          <Switch checked={discoverable} onCheckedChange={setDiscoverable} />
        </div>
      )}

      <div className="mt-4 space-y-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
        <div><Label>Full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" /></div>
        <div><Label>Home country</Label><Input value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1.5" /></div>
        <div><Label>University</Label><Input value={university} onChange={(e) => setUniversity(e.target.value)} className="mt-1.5" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Year</Label><Input value={year} onChange={(e) => setYear(e.target.value)} className="mt-1.5" /></div>
          <div><Label>Major</Label><Input value={major} onChange={(e) => setMajor(e.target.value)} className="mt-1.5" /></div>
        </div>
        <div><Label>Languages</Label><Input value={languages} onChange={(e) => setLanguages(e.target.value)} className="mt-1.5" placeholder="Comma-separated" /></div>
      </div>

      <div className="mt-4 space-y-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-soft)]">
        <div><Label>Fun fact</Label><Textarea value={funFact} onChange={(e) => setFunFact(e.target.value)} rows={2} className="mt-1.5" /></div>
        <div><Label>Best advice I got</Label><Textarea value={advice} onChange={(e) => setAdvice(e.target.value)} rows={2} className="mt-1.5" /></div>
        <div><Label>{profile.role === "mentor" ? "Mentees I'd love to meet" : "Looking for a mentor who…"}</Label>
          <Textarea value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} rows={2} className="mt-1.5" /></div>
      </div>

      <Button onClick={save} disabled={saving} size="lg" className="mt-5 w-full">
        {saving ? "Saving…" : "Save changes"}
      </Button>

      <Button onClick={handleSignOut} variant="outline" size="lg" className="mt-3 w-full">
        <LogOut className="mr-2 h-4 w-4" /> Log out
      </Button>
    </div>
  );
}
