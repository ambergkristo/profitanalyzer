import { NavLink, Outlet } from "react-router-dom";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm font-medium transition ${
    isActive ? "bg-accent/15 text-accent" : "text-muted hover:text-text"
  }`;

export function Layout() {
  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 md:px-6">
        <header className="rounded-[2rem] border border-border bg-panel/90 p-5 shadow-telemetry backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-accent">Menu Profit Optimizer</p>
              <h1 className="mt-2 font-display text-3xl leading-none md:text-5xl">Decision Console</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                Track dish-level margin, spot hidden profit leaks, and know what to fix first.
              </p>
            </div>
            <nav className="flex flex-wrap gap-2">
              <NavLink className={linkClass} to="/">
                Dashboard
              </NavLink>
              <NavLink className={linkClass} to="/dishes">
                Dishes
              </NavLink>
            </nav>
          </div>
        </header>

        <main className="mt-6 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
