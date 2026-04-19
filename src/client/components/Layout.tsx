import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Home" },
  { href: "/sermons", label: "Sermons" },
  { href: "/events", label: "Events" },
  { href: "/about", label: "About" },
  { href: "/give", label: "Give" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [path] = useLocation();

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-10 bg-cream-100/90 backdrop-blur border-b border-cream-200">
        <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl text-brand-600">
            Refuge
          </Link>
          <nav className="hidden md:flex gap-1">
            {nav.map((n) => {
              const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "px-3 py-2 rounded-full text-sm transition-colors",
                    active
                      ? "bg-brand-500 text-cream-50"
                      : "text-brand-700 hover:bg-cream-200",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <nav className="md:hidden sticky bottom-0 z-10 bg-cream-50 border-t border-cream-200">
        <div className="grid grid-cols-5">
          {nav.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "py-3 text-center text-xs font-medium",
                  active ? "text-brand-600" : "text-ink-muted",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <footer className="hidden md:block border-t border-cream-200 py-6 text-center text-xs text-ink-muted">
        Refuge Community Church
      </footer>
    </div>
  );
}
