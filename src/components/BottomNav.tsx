import { Link, useLocation } from '@tanstack/react-router'
import { Compass, MessageCircle, Users, CalendarDays, User } from 'lucide-react'
import { useAuth } from '@/lib/auth'

const TABS = [
  { to: '/app/discover', label: 'Discover', icon: Compass },
  { to: '/app/chats', label: 'Chats', icon: MessageCircle },
  { to: '/app/community', label: 'Community', icon: Users },
  { to: '/app/events', label: 'Events', icon: CalendarDays },
  { to: '/app/profile', label: 'Profile', icon: User },
] as const

export function BottomNav() {
  const loc = useLocation()
  const { profile } = useAuth()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-[480px] items-stretch justify-around">
        {TABS.map(({ to, icon: Icon, label }) => {
          const active = loc.pathname.startsWith(to)
          const displayLabel =
            to === '/app/discover' && profile?.role === 'mentor' ? 'Requests' : label

          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span className={active ? 'font-semibold' : ''}>{displayLabel}</span>
            </Link>
          )
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
