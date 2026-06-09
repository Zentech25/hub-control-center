import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  Send,
  Power,
  LogOut,
  Shield,
  Activity,
  Clock,
} from "lucide-react";
import { getSession, logout } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && !getSession()) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [username, setUsername] = useState("operator");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const s = getSession();
    if (s) setUsername(s.username);
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const nav = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/transfer", label: "File Transfer", icon: Send },
    { to: "/power", label: "Power Control", icon: Power },
  ] as const;

  function onLogout() {
    logout();
    navigate({ to: "/login" });
  }

  return (
    <div className="grid-bg flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              CTN Indoor
            </div>
            <div className="font-mono text-sm font-semibold">Control Hub</div>
          </div>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to || (item.to === "/dashboard" && pathname === "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-primary"
                  />
                )}
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 rounded-md border border-border bg-panel/40 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs">
              <div className="font-mono text-sm">{username}</div>
              <div className="text-muted-foreground">Operator</div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={onLogout}
              title="Sign out"
              className="h-8 w-8"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-panel/40 px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Activity className="h-4 w-4 text-primary" />
            <span className="font-mono uppercase tracking-widest text-xs">
              Operations Console
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="status-dot status-dot-on" />
              SYS LINK
            </span>
            <span className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              {now.toLocaleTimeString([], { hour12: false })}
            </span>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
