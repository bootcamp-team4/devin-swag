import { Link, NavLink, Outlet } from "react-router-dom";

const NAV_LINKS = [
  { to: "/", label: "Editor" },
  { to: "/designs", label: "My designs" },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  const base =
    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  return isActive
    ? `${base} bg-ink text-paper`
    : `${base} text-muted hover:bg-canvas hover:text-ink`;
}

export default function AppLayout() {
  return (
    <div className="min-h-dvh bg-canvas text-ink flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:border focus:border-rule focus:bg-paper focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-rule/80 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between gap-6 px-6 py-4">
          <Link
            to="/"
            className="text-lg font-semibold tracking-tight transition-colors hover:text-accent"
          >
            Cognition Merch Designer
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={navLinkClass}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 mx-auto w-full max-w-[90rem] px-6 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-rule bg-paper">
        <div className="mx-auto w-full max-w-[90rem] px-6 py-4 text-sm text-muted">
          Designs are saved in this browser only. Downloads are mockups, not production artwork.
        </div>
      </footer>
    </div>
  );
}
