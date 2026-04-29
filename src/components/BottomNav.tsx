import { Link, useLocation } from "@tanstack/react-router";
import { Compass, MessageCircle, Users, Calendar, User } from "lucide-react";
import { useAuth } from "@/lib/auth";

const tabs = [
  { to: "/app/discover", label: "Discover", icon: Compass },
  { to: "/app/chats", label: "Chats", icon: MessageCircle },
  { to: "/app/community", label: "Community", icon: Users },
  { to: "/app/events", label: "Events", icon: Calendar },
  { to: "/app/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const loc = useLocation();
  const { profile } = useAuth();
  const discoverLabel = profile?.role === "mentor" ? "Requests" : "Discover";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = loc.pathname.startsWith(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span className={active ? "font-semibold" : ""}>
                {t.to === "/app/discover" ? discoverLabel : t.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
