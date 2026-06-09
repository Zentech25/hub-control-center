import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "motion/react";
import { Shield, Lock, User, Loader2, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login } from "@/lib/auth";
import { ParticlesBg } from "@/components/particles-bg";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — CTN Indoor Control" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login(username, password);
      navigate({ to: "/dashboard" });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid-bg relative flex h-screen w-screen items-center justify-center overflow-hidden p-6">
      <ParticlesBg />
      {/* Ambient orbs */}
      <motion.div
        className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl"
        animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
        {/* Brand panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden flex-col justify-between rounded-xl panel scanline p-8 md:flex"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                CTN Indoor
              </div>
              <div className="font-mono text-lg font-semibold">Control Hub</div>
            </div>
          </div>

          <div className="space-y-4">
            <Radar className="h-10 w-10 text-accent" />
            <h1 className="text-3xl font-semibold leading-tight">
              Unified command for{" "}
              <span className="text-primary">212 endpoints</span> across 8 platforms.
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitor liveness, push files between hosts, and remotely shut down
              workstations from a single tactical console.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 font-mono text-xs">
            {[
              ["Drone", "50"],
              ["Sniper", "42"],
              ["IWTS", "28"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border border-border bg-panel/50 p-3">
                <div className="text-muted-foreground uppercase tracking-wider">{k}</div>
                <div className="mt-1 text-lg text-foreground">{v}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Form */}
        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-xl panel p-8"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Operator Sign-in</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Authenticate to access the hub.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-panel/70 px-3 py-1 text-xs">
              <span className="status-dot status-dot-on" />
              <span className="text-muted-foreground">Link active</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="u">Username</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="u"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="operator"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="p"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                />
              </div>
            </div>

            {err && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {err}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full font-mono uppercase tracking-widest"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Authenticating" : "Sign in"}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Any credentials work in demo mode.
            </p>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
