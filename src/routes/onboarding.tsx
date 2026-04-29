import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { GraduationCap, UserCog, ArrowLeft, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const INTERESTS = [
  "Cooking", "Hiking", "Gaming", "Music", "Sports", "Art", "Reading", "Movies",
  "Travel", "Photography", "Coding", "Dance", "Languages", "Coffee", "Fitness",
  "Volunteering", "Anime", "Board Games", "Fashion", "Politics",
];

function Onboarding() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [role, setRole] = useState<"first_year" | "mentor">("first_year");
  const [homeCountry, setHomeCountry] = useState("");
  const [university, setUniversity] = useState("");
  const [year, setYear] = useState("");
  const [major, setMajor] = useState("");
  const [languages, setLanguages] = useState("");
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

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      role,
      home_country: homeCountry,
      university,
      academic_year: year,
      major,
      languages: languages.split(",").map((l) => l.trim()).filter(Boolean),
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

    // Insert role into user_roles
    await supabase.from("user_roles").upsert({ user_id: user.id, role }, { onConflict: "user_id,role" });

    await refreshProfile();
    setSaving(false);
    toast.success("You're all set!");
    navigate({ to: "/app/discover" });
  };

  const steps = [
    {
      title: "I'm signing up as a…",
      content: (
        <div className="space-y-3">
          <RoleCard
            active={role === "first_year"}
            onClick={() => setRole("first_year")}
            icon={<GraduationCap className="h-6 w-6" />}
            title="First-year international student"
            desc="Looking to find a mentor who's been through it."
          />
          <RoleCard
            active={role === "mentor"}
            onClick={() => setRole("mentor")}
            icon={<UserCog className="h-6 w-6" />}
            title="Experienced student mentor"
            desc="I've been here a while and want to help others."
          />
        </div>
      ),
      valid: true,
    },
    {
      title: "Tell us about you",
      content: (
        <div className="space-y-4">
          <div>
            <Label>Home country</Label>
            <Input value={homeCountry} onChange={(e) => setHomeCountry(e.target.value)} placeholder="Brazil" className="mt-1.5" />
          </div>
          <div>
            <Label>University</Label>
            <Input value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="State University" className="mt-1.5" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Year</Label>
              <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Sophomore" className="mt-1.5" />
            </div>
            <div>
              <Label>Major</Label>
              <Input value={major} onChange={(e) => setMajor(e.target.value)} placeholder="CS" className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label>Languages spoken</Label>
            <Input value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="English, Portuguese, Spanish" className="mt-1.5" />
            <p className="mt-1 text-xs text-muted-foreground">Comma-separated</p>
          </div>
        </div>
      ),
      valid: homeCountry.length > 0 && university.length > 0,
    },
    {
      title: "What are you into?",
      content: (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">Pick all that apply.</p>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleInterest(i)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                  interests.includes(i)
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
      ),
      valid: interests.length > 0,
    },
    {
      title: "A few prompts",
      content: (
        <div className="space-y-4">
          <div>
            <Label>A fun fact about me…</Label>
            <Textarea value={funFact} onChange={(e) => setFunFact(e.target.value)} className="mt-1.5" rows={2} />
          </div>
          <div>
            <Label>Best advice I ever got…</Label>
            <Textarea value={advice} onChange={(e) => setAdvice(e.target.value)} className="mt-1.5" rows={2} />
          </div>
          <div>
            <Label>{role === "mentor" ? "Mentees I'd love to meet…" : "I'm looking for a mentor who…"}</Label>
            <Textarea value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} className="mt-1.5" rows={2} />
          </div>
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
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!cur.valid} className="flex-1">
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={saving} className="flex-1">
              {saving ? "Saving…" : "Finish"}
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
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-4 rounded-2xl border-2 p-4 text-left transition ${
        active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>
      </div>
    </button>
  );
}
