import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Globe2, Sparkles, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user && profile?.onboarded) navigate({ to: "/app/discover" });
    else if (user && profile && !profile.onboarded) navigate({ to: "/onboarding" });
  }, [user, profile, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div
        className="relative overflow-hidden"
        style={{ background: "var(--gradient-warm)" }}
      >
        <div className="mx-auto max-w-md px-6 pb-16 pt-20 text-primary-foreground">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            For international students
          </div>
          <h1 className="text-5xl font-bold leading-tight tracking-tight">
            Find your mentor.
            <br />
            Find your people.
          </h1>
          <p className="mt-4 text-base text-white/90">
            MentorMatch pairs first-year international students with experienced upperclassmen who've
            been through it all.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Button asChild size="lg" variant="secondary" className="h-12 text-base">
              <Link to="/signup">Get started</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="h-12 text-base text-white hover:bg-white/10 hover:text-white"
            >
              <Link to="/login">I already have an account</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-6 px-6 py-12">
        <Feature
          icon={<Globe2 className="h-6 w-6" />}
          title="Made for international students"
          desc="Sign up with your university email and connect with people who get the international experience."
        />
        <Feature
          icon={<Sparkles className="h-6 w-6" />}
          title="Swipe to match"
          desc="Browse mentor profiles and request the ones who match your interests, country, or major."
        />
        <Feature
          icon={<MessageCircle className="h-6 w-6" />}
          title="Chat & community"
          desc="Direct messages, group chats, and a global lounge. Plus campus events and clubs."
        />
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-4 rounded-2xl bg-card p-5 shadow-[var(--shadow-soft)]">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-primary-foreground"
        style={{ background: "var(--gradient-warm)" }}
      >
        {icon}
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
