import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  RefreshCw,
  Power,
  Send,
  Filter,
  CheckCircle2,
  XCircle,
  Cpu,
  Network,
  Loader2,
  RotateCw,
  PlayCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  DEVICES,
  CATEGORIES,
  shutdownDevice,
  restartDevice,
  bootDevice,
  type Device,
} from "@/lib/devices";
import { useDeviceStatus } from "@/hooks/use-device-status";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

type PowerAction = "shutdown" | "restart" | "boot";

interface ActionTarget {
  device: Device;
  action: PowerAction;
}

const ACTION_META: Record<
  PowerAction,
  {
    title: string;
    verb: string;
    description: string;
    icon: typeof Power;
    confirmVariant: "destructive" | "default";
    toast: string;
    run: (ip: string) => Promise<{ ok: boolean }>;
  }
> = {
  shutdown: {
    title: "Confirm shutdown",
    verb: "Shut down",
    description:
      "This will send a shutdown command to the target endpoint. The host will become unreachable until manually powered on.",
    icon: Power,
    confirmVariant: "destructive",
    toast: "Shutdown command sent",
    run: shutdownDevice,
  },
  restart: {
    title: "Confirm restart",
    verb: "Restart",
    description:
      "This will reboot the target endpoint. The host will be briefly unreachable while it restarts.",
    icon: RotateCw,
    confirmVariant: "destructive",
    toast: "Restart command sent",
    run: restartDevice,
  },
  boot: {
    title: "Confirm boot",
    verb: "Boot up",
    description:
      "This will send a Wake-on-LAN magic packet to the target endpoint. Boot can take up to a minute to complete.",
    icon: PlayCircle,
    confirmVariant: "default",
    toast: "Boot command sent",
    run: bootDevice,
  },
};

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CTN Indoor Control" }] }),
  component: Dashboard,
});

type StatusFilter = "all" | "online" | "offline";

function Dashboard() {
  const { status, refresh, lastUpdate } = useDeviceStatus();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [stat, setStat] = useState<StatusFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return DEVICES.filter((d) => {
      if (cat !== "all" && d.category !== cat) return false;
      const s = status[d.id] ?? "unknown";
      if (stat !== "all" && s !== stat) return false;
      if (!query) return true;
      return (
        d.unit.toLowerCase().includes(query) ||
        d.cpu.toLowerCase().includes(query) ||
        d.ip.toLowerCase().includes(query) ||
        d.category.toLowerCase().includes(query)
      );
    });
  }, [q, cat, stat, status]);

  const stats = useMemo(() => {
    let on = 0, off = 0;
    for (const d of DEVICES) {
      const s = status[d.id];
      if (s === "online") on++;
      else if (s === "offline") off++;
    }
    return { total: DEVICES.length, on, off, unknown: DEVICES.length - on - off };
  }, [status]);

  // Group filtered by category for sectioning
  const grouped = useMemo(() => {
    const m = new Map<string, Device[]>();
    for (const d of filtered) {
      if (!m.has(d.category)) m.set(d.category, []);
      m.get(d.category)!.push(d);
    }
    return Array.from(m.entries());
  }, [filtered]);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 400);
  }

  async function confirmShutdown() {
    if (!shutdownTarget) return;
    setShutdownLoading(true);
    try {
      await shutdownDevice(shutdownTarget.ip);
      toast.success(`Shutdown command sent to ${shutdownTarget.unit} · ${shutdownTarget.cpu}`);
      setShutdownTarget(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setShutdownLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Endpoint Overview</h1>
          <p className="text-sm text-muted-foreground">
            Live status of all hub workstations. Updated{" "}
            <span className="font-mono">
              {new Date(lastUpdate).toLocaleTimeString([], { hour12: false })}
            </span>
            .
          </p>
        </div>
        <Button
          onClick={onRefresh}
          variant="secondary"
          className="font-mono uppercase tracking-widest text-xs"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total endpoints" value={stats.total} icon={Cpu} accent="muted" />
        <StatCard label="Online" value={stats.on} icon={CheckCircle2} accent="online" />
        <StatCard label="Offline" value={stats.off} icon={XCircle} accent="offline" />
        <StatCard label="Categories" value={CATEGORIES.length} icon={Network} accent="primary" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg panel p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by unit, CPU role, IP, category…"
            className="pl-9"
          />
        </div>
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stat} onValueChange={(v) => setStat(v as StatusFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto font-mono text-xs text-muted-foreground">
          {filtered.length} / {DEVICES.length} shown
        </div>
      </div>

      {/* Grouped device sections */}
      {grouped.length === 0 ? (
        <div className="rounded-lg panel p-10 text-center text-sm text-muted-foreground">
          No endpoints match the current filters.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, devices]) => {
            const onCount = devices.filter((d) => status[d.id] === "online").length;
            return (
              <section key={category} className="space-y-3">
                <div className="flex items-center gap-3">
                  <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-muted-foreground">
                    {category}
                  </h2>
                  <div className="h-px flex-1 bg-border" />
                  <Badge variant="secondary" className="font-mono">
                    {onCount}/{devices.length} online
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <AnimatePresence mode="popLayout">
                    {devices.map((d) => (
                      <DeviceCard
                        key={d.id}
                        device={d}
                        status={status[d.id] ?? "unknown"}
                        onShutdown={() => setShutdownTarget(d)}
                        onTransfer={() =>
                          navigate({
                            to: "/transfer",
                            search: { source: String(d.id) } as never,
                          })
                        }
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Shutdown dialog */}
      <Dialog open={!!shutdownTarget} onOpenChange={(o) => !o && setShutdownTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Power className="h-5 w-5 text-destructive" />
              Confirm shutdown
            </DialogTitle>
            <DialogDescription>
              This will send a shutdown command to the target endpoint. The host
              will become unreachable until rebooted.
            </DialogDescription>
          </DialogHeader>
          {shutdownTarget && (
            <div className="rounded-md border border-border bg-panel/40 p-3 font-mono text-sm">
              <div>
                <span className="text-muted-foreground">Unit:</span> {shutdownTarget.unit}
              </div>
              <div>
                <span className="text-muted-foreground">CPU:</span> {shutdownTarget.cpu}
              </div>
              <div>
                <span className="text-muted-foreground">IP:</span> {shutdownTarget.ip}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShutdownTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmShutdown}
              disabled={shutdownLoading}
            >
              {shutdownLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Power className="mr-2 h-4 w-4" />
              )}
              Shut down
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: "online" | "offline" | "primary" | "muted";
}) {
  const color =
    accent === "online"
      ? "text-online"
      : accent === "offline"
        ? "text-offline"
        : accent === "primary"
          ? "text-primary"
          : "text-muted-foreground";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="panel relative overflow-hidden p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className={`mt-2 font-mono text-3xl ${color}`}>{value}</div>
    </motion.div>
  );
}

function DeviceCard({
  device,
  status,
  onShutdown,
  onTransfer,
}: {
  device: Device;
  status: "online" | "offline" | "unknown";
  onShutdown: () => void;
  onTransfer: () => void;
}) {
  const isOn = status === "online";
  const isOff = status === "offline";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      whileHover={{ y: -2 }}
      className={`panel group relative overflow-hidden p-4 transition-colors ${
        isOff ? "border-destructive/30" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`status-dot ${isOn ? "status-dot-on" : "status-dot-off"}`} />
            <div className="truncate font-mono text-sm">{device.unit}</div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{device.cpu}</div>
        </div>
        <Badge
          variant="outline"
          className={`font-mono text-[10px] uppercase ${
            isOn
              ? "border-online/40 text-online"
              : isOff
                ? "border-offline/40 text-offline"
                : "text-muted-foreground"
          }`}
        >
          {isOn ? "Online" : isOff ? "Offline" : "…"}
        </Badge>
      </div>

      <div className="mt-3 rounded-md border border-border/60 bg-background/40 px-2 py-1.5 font-mono text-xs text-foreground/90">
        {device.ip}
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          onClick={onTransfer}
          disabled={!isOn}
          title={isOn ? "Send file from this device" : "Device offline"}
        >
          <Send className="mr-1 h-3.5 w-3.5" />
          Transfer
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="flex-1"
          onClick={onShutdown}
          disabled={!isOn}
        >
          <Power className="mr-1 h-3.5 w-3.5" />
          Shutdown
        </Button>
      </div>
    </motion.div>
  );
}
