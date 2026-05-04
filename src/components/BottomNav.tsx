import { Link, useLocation } from "@tanstack/react-router";
import { Compass, MessageCircle, Users, Calendar, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";

const tabs = [
  { to: "/app/discover", key: "nav.discover", icon: Compass },
  { to: "/app/chats", key: "nav.chats", icon: MessageCircle },
  { to: "/app/community", key: "nav.community", icon: Users },
  { to: "/app/events", key: "nav.events", icon: Calendar },
  { to: "/app/profile", key: "nav.profile", icon: User },
] as const;

export function BottomNav() {
  const loc = useLocation();
  const { profile } = useAuth();
  const { t } = useT();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = loc.pathname.startsWith(tab.to);
          const label =
            tab.to === "/app/discover" && profile?.role === "mentor"
              ? t("nav.requests")
              : t(tab.key);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span className={active ? "font-semibold" : ""}>{label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
