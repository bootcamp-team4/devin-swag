import { NavLink, Outlet } from "react-router-dom";

const NAV_LINKS = [
  { to: "/", label: "Editor" },
  { to: "/designs", label: "Saved designs" },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  const base =
    "rounded-sm px-2 py-1 text-sm no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
  return isActive
    ? `${base} text-ink font-medium border-b-2 border-accent`
    : `${base} text-muted border-b-2 border-transparent hover:text-ink`;
}

export default function AppLayout() {
  return (
    <div className="min-h-dvh bg-paper text-ink flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:border focus:border-rule focus:bg-paper focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <header className="border-b border-rule">
        <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between gap-6 px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">Cognition Merch Designer</span>
          <nav aria-label="Primary" className="flex items-center gap-2">
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
      <main id="main" tabIndex={-1} className="flex-1 mx-auto w-full max-w-[90rem] px-6 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-rule">
        <div className="mx-auto w-full max-w-[90rem] px-6 py-3 text-sm text-muted">
          Saved designs are shared with everyone. Downloads are mockups, not production artwork.
        </div>
      </footer>
    </div>
  );
}
