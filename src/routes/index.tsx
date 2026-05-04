import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import udLogo from "@/assets/delaware-blue-hens.png";

export const Route = createFileRoute("/")({
  component: Landing,
});

const FLAG_CODES = [
  "br", "cn", "mx", "in", "fr", "kr", "ng", "eg",
  "jp", "es", "de", "it", "tr", "vn", "co", "za",
  "sa", "ca", "gb", "ar", "th", "ph", "ke", "pk",
];

function Flag({ code, className = "" }: { code: string; className?: string }) {
  return (
    <img
      src={`https://flagcdn.com/w80/${code}.png`}
      srcSet={`https://flagcdn.com/w160/${code}.png 2x`}
      alt={code}
      loading="lazy"
      className={`inline-block rounded-sm shadow-sm ${className}`}
    />
  );
}

function Landing() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user && profile?.onboarded) navigate({ to: "/app/discover" });
    else if (user && profile && !profile.onboarded) navigate({ to: "/onboarding" });
    else {
      try {
        if (!localStorage.getItem("mm_lang")) navigate({ to: "/welcome" });
      } catch {}
    }
  }, [user, profile, loading, navigate]);

  return (
    <div className="min-h-screen bg-[oklch(0.98_0.02_85)]">
      <div className="mx-auto max-w-md px-6 pb-10 pt-10">
        <div className="relative overflow-hidden rounded-3xl bg-card p-6 shadow-[var(--shadow-card)]">
          <div className="grid grid-cols-6 gap-2 opacity-80">
            {FLAG_CODES.map((c, i) => (
              <Flag
                key={i}
                code={c}
                className="h-6 w-9 object-cover"
              />
            ))}
          </div>

          <div className="mt-4 flex justify-center">
            <img
              src={udLogo}
              alt="Delaware Blue Hens"
              className="h-28 w-auto object-contain drop-shadow-md"
            />
          </div>

          <h1 className="mt-4 text-center text-4xl font-extrabold leading-tight tracking-tight">
            Hey there! 👋
            <br />
            <span style={{ color: "var(--primary)" }}>Find your people</span> at UD.
          </h1>
          <p className="mt-3 text-center text-base text-muted-foreground">
            A friendly app to match first-year international Blue Hens with mentors who've been there. 🌍✨
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Button asChild size="lg" className="h-12 rounded-full text-base">
              <Link to="/signup">Let's go 🚀</Link>
            </Button>
            <Button asChild size="lg" variant="ghost" className="h-12 rounded-full text-base">
              <Link to="/login">I already have an account</Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {FLAG_CODES.slice(0, 16).map((c, i) => (
            <Flag key={i} code={c} className="h-5 w-8 object-cover" />
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Made with ❤️ for international students at the University of Delaware
        </p>
      </div>
    </div>
  );
}
