import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "MentorMatch — Mentorship for International Students" },
      {
        name: "description",
        content:
          "MentorMatch connects first-year international students with experienced mentors at their university. Match, chat, and find your community.",
      },
      { property: "og:title", content: "MentorMatch — Mentorship for International Students" },
      {
        property: "og:description",
        content: "Find your mentor. Build your community. Make your university feel like home.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "MentorMatch — Mentorship for International Students" },
      { name: "description", content: "Global Gateway connects international students with mentors for academic and social support." },
      { property: "og:description", content: "Global Gateway connects international students with mentors for academic and social support." },
      { name: "twitter:description", content: "Global Gateway connects international students with mentors for academic and social support." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9fe70ece-fcdc-4c5d-ac17-e8ecec615180/id-preview-9233543d--763d7d7a-6c53-45a8-95f0-81088b42012c.lovable.app-1778188096060.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9fe70ece-fcdc-4c5d-ac17-e8ecec615180/id-preview-9233543d--763d7d7a-6c53-45a8-95f0-81088b42012c.lovable.app-1778188096060.png" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <I18nProvider>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-center" />
      </AuthProvider>
    </I18nProvider>
  );
}
