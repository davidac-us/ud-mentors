import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

const schema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(255)
    .refine((e) => /\.edu(\.[a-z]{2,3})?$/i.test(e), {
      message: "Must be a university (.edu) email",
    }),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
  fullName: z.string().trim().min(1, "Required").max(80),
});

function SignupPage() {
  const navigate = useNavigate();
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password, fullName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: parsed.data.fullName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("signup.success"));
    navigate({ to: "/onboarding" });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-6 pt-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
        </Link>
      </div>
      <div className="mx-auto max-w-md px-6 pt-6">
        <h1 className="text-3xl font-bold">{t("signup.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("signup.subtitle")}
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div>
            <Label htmlFor="name">{t("signup.fullName")}</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1.5" placeholder="Maya Chen" />
          </div>
          <div>
            <Label htmlFor="email">{t("signup.email")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" placeholder="you@university.edu" />
            <p className="mt-1 text-xs text-muted-foreground">{t("signup.emailHint")}</p>
          </div>
          <div>
            <Label htmlFor="pw">{t("signup.password")}</Label>
            <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" placeholder={t("signup.passwordPh")} />
          </div>
          <Button type="submit" disabled={loading} size="lg" className="w-full">
            {loading ? t("signup.creating") : t("signup.create")}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("signup.haveAccount")}{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t("signup.login")}
          </Link>
        </p>
      </div>
    </div>
  );
}
