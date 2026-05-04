import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import udLogo from "@/assets/ud-logo.png";

export const Route = createFileRoute("/welcome")({
  component: Welcome,
});

const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "fr", label: "French", native: "Français" },
];

function Welcome() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"loading" | "language">("loading");

  useEffect(() => {
    const t = setTimeout(() => setPhase("language"), 1800);
    return () => clearTimeout(t);
  }, []);

  const pick = (code: string) => {
    try { localStorage.setItem("mm_lang", code); } catch {}
    navigate({ to: "/" });
  };

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <img src={udLogo} alt="University of Delaware" width={160} height={160} className="h-40 w-40 object-contain" />
        <div className="mt-10 flex gap-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-3 w-3 rounded-full bg-primary"
              style={{
                animation: "mm-bounce 1s infinite ease-in-out",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
        <style>{`@keyframes mm-bounce { 0%, 80%, 100% { transform: translateY(0); opacity: .6 } 40% { transform: translateY(-12px); opacity: 1 } }`}</style>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-10">
      <img src={udLogo} alt="University of Delaware" width={96} height={96} className="h-24 w-24 object-contain" />
      <h1 className="mt-6 text-2xl font-bold">Choose your language</h1>
      <p className="mt-1 text-sm text-muted-foreground">Escolha o seu idioma · 选择语言 · اختر لغتك</p>
      <div className="mt-8 grid w-full max-w-sm grid-cols-1 gap-3">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => pick(l.code)}
            className="flex items-center justify-between rounded-2xl border-2 border-border bg-card px-5 py-4 text-left transition hover:border-primary/60 hover:bg-primary/5"
          >
            <span className="font-semibold">{l.native}</span>
            <span className="text-sm text-muted-foreground">{l.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
