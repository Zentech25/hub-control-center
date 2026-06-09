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
  AlertTriangle,
  PowerOff,
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
  type Device,
} from "@/lib/devices";
import { useDeviceStatus } from "@/hooks/use-device-status";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

type PowerAction = "shutdown" | "restart";

// Single-device action target
interface SingleTarget {
  kind: "single";
  device: Device;
  action: PowerAction;
}
// Bulk shutdown of a whole unit (e.g. all CPUs in "DRONE 1")
interface UnitTarget {
  kind: "unit";
  category: string;
  unit: string;
  devices: Device[];
}
// Bulk shutdown of a whole category (e.g. all Drones)
interface CategoryTarget {
  kind: "category";
  category: string;
  devices: Device[];
}
type ActionTarget = SingleTarget | UnitTarget | CategoryTarget;

const SINGLE_META: Record<
  PowerAction,
  {
    title: string;
    verb: string;
    description: string;
    icon: typeof Power;
    variant: "destructive" | "default";
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
    variant: "destructive",
    toast: "Shutdown command sent",
    run: shutdownDevice,
  },
  restart: {
    title: "Confirm restart",
    verb: "Restart",
    description:
      "This will reboot the target endpoint. The host will be briefly unreachable while it restarts.",
    icon: RotateCw,
    variant: "destructive",
    toast: "Restart command sent",
    run: restartDevice,
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

  // Group filtered: category -> unit -> devices[]
  const grouped = useMemo(() => {
    const byCat = new Map<string, Map<string, Device[]>>();
    for (const d of filtered) {
      if (!byCat.has(d.category)) byCat.set(d.category, new Map());
      const units = byCat.get(d.category)!;
      if (!units.has(d.unit)) units.set(d.unit, []);
      units.get(d.unit)!.push(d);
    }
    return Array.from(byCat.entries()).map(([category, units]) => ({
      category,
      units: Array.from(units.entries()).map(([unit, devices]) => ({ unit, devices })),
    }));
  }, [filtered]);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 400);
  }

  async function confirmAction() {
    if (!actionTarget) return;
    setActionLoading(true);
    try {
      if (actionTarget.kind === "single") {
        const meta = SINGLE_META[actionTarget.action];
        await meta.run(actionTarget.device.ip);
        toast.success(
          `${meta.toast}: ${actionTarget.device.unit} · ${actionTarget.device.cpu}`,
        );
      } else {
        // Bulk shutdown — only target online devices
        const targets = actionTarget.devices.filter((d) => status[d.id] === "online");
        await Promise.all(targets.map((d) => shutdownDevice(d.ip)));
        const label =
          actionTarget.kind === "unit"
            ? actionTarget.unit
            : `all ${actionTarget.category}`;
        toast.success(`Shutdown sent to ${targets.length} endpoint(s) in ${label}`);
      }
      setActionTarget(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="space-y-8 p-6">
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

      {/* Grouped sections */}
      {grouped.length === 0 ? (
        <div className="rounded-lg panel p-10 text-center text-sm text-muted-foreground">
          No endpoints match the current filters.
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map(({ category, units }) => {
            const allDevices = units.flatMap((u) => u.devices);
            const onCount = allDevices.filter((d) => status[d.id] === "online").length;
            const anyOnline = onCount > 0;
            return (
              <section key={category} className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
                    {category}
                  </h2>
                  <Badge variant="secondary" className="font-mono">
                    {onCount}/{allDevices.length} online
                  </Badge>
                  <div className="h-px flex-1 bg-border" />
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!anyOnline}
                    onClick={() =>
                      setActionTarget({ kind: "category", category, devices: allDevices })
                    }
                    title={anyOnline ? `Shutdown all ${category}` : "Nothing online"}
                  >
                    <PowerOff className="mr-1.5 h-3.5 w-3.5" />
                    Shutdown all {category}
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {units.map(({ unit, devices }) => (
                      <UnitBox
                        key={unit}
                        category={category}
                        unit={unit}
                        devices={devices}
                        status={status}
                        onSingleAction={(device, action) =>
                          setActionTarget({ kind: "single", device, action })
                        }
                        onUnitShutdown={() =>
                          setActionTarget({ kind: "unit", category, unit, devices })
                        }
                        onTransfer={(device) =>
                          navigate({
                            to: "/transfer",
                            search: { source: String(device.id) } as never,
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

      {/* Action confirmation dialog */}
      <Dialog
        open={!!actionTarget}
        onOpenChange={(o) => !o && !actionLoading && setActionTarget(null)}
      >
        <DialogContent>
          {actionTarget && (() => {
            if (actionTarget.kind === "single") {
              const meta = SINGLE_META[actionTarget.action];
              const Icon = meta.icon;
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      {meta.title}
                    </DialogTitle>
                    <DialogDescription>{meta.description}</DialogDescription>
                  </DialogHeader>
                  <div className="rounded-md border border-border bg-panel/40 p-3 font-mono text-sm space-y-0.5">
                    <div>
                      <span className="text-muted-foreground">Unit:</span> {actionTarget.device.unit}
                    </div>
                    <div>
                      <span className="text-muted-foreground">CPU:</span> {actionTarget.device.cpu}
                    </div>
                    <div>
                      <span className="text-muted-foreground">IP:</span> {actionTarget.device.ip}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setActionTarget(null)} disabled={actionLoading}>
                      Cancel
                    </Button>
                    <Button variant={meta.variant} onClick={confirmAction} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icon className="mr-2 h-4 w-4" />}
                      {meta.verb}
                    </Button>
                  </DialogFooter>
                </>
              );
            }
            // Bulk
            const onlineDevices = actionTarget.devices.filter((d) => status[d.id] === "online");
            const label =
              actionTarget.kind === "unit"
                ? `${actionTarget.unit}`
                : `all ${actionTarget.category} systems`;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Confirm bulk shutdown
                  </DialogTitle>
                  <DialogDescription>
                    This will send a shutdown command to every online endpoint in {label}. Offline
                    endpoints will be skipped.
                  </DialogDescription>
                </DialogHeader>
                <div className="rounded-md border border-border bg-panel/40 p-3 font-mono text-xs max-h-48 overflow-auto space-y-1">
                  {onlineDevices.length === 0 ? (
                    <div className="text-muted-foreground">No online endpoints to shut down.</div>
                  ) : (
                    onlineDevices.map((d) => (
                      <div key={d.id} className="flex justify-between gap-4">
                        <span>{d.unit} · {d.cpu}</span>
                        <span className="text-muted-foreground">{d.ip}</span>
                      </div>
                    ))
                  )}
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setActionTarget(null)} disabled={actionLoading}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={confirmAction}
                    disabled={actionLoading || onlineDevices.length === 0}
                  >
                    {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PowerOff className="mr-2 h-4 w-4" />}
                    Shut down {onlineDevices.length}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
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
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className={`mt-2 font-mono text-3xl ${color}`}>{value}</div>
    </motion.div>
  );
}

function UnitBox({
  category,
  unit,
  devices,
  status,
  onSingleAction,
  onUnitShutdown,
  onTransfer,
}: {
  category: string;
  unit: string;
  devices: Device[];
  status: Record<number, "online" | "offline" | "unknown">;
  onSingleAction: (d: Device, action: PowerAction) => void;
  onUnitShutdown: () => void;
  onTransfer: (d: Device) => void;
}) {
  const onCount = devices.filter((d) => status[d.id] === "online").length;
  const total = devices.length;
  const allOff = onCount === 0;
  const allOn = onCount === total;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className={`panel flex flex-col gap-3 p-4 ${allOff ? "border-destructive/30" : ""}`}
    >
      {/* Unit header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`status-dot ${
                allOn ? "status-dot-on" : allOff ? "status-dot-off" : "status-dot-on opacity-60"
              }`}
            />
            <h3 className="truncate font-mono text-sm font-semibold tracking-wide">{unit}</h3>
          </div>
          <div className="mt-0.5 text-[11px] uppercase tracking-widest text-muted-foreground">
            {category}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`font-mono text-[10px] ${
              allOn
                ? "border-online/40 text-online"
                : allOff
                  ? "border-offline/40 text-offline"
                  : "text-muted-foreground"
            }`}
          >
            {onCount}/{total}
          </Badge>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 px-2 text-[11px]"
            onClick={onUnitShutdown}
            disabled={allOff}
            title={allOff ? "Nothing online" : `Shutdown all in ${unit}`}
          >
            <PowerOff className="mr-1 h-3 w-3" />
            Shutdown unit
          </Button>
        </div>
      </div>

      {/* CPU rows */}
      <div className="flex flex-col divide-y divide-border/40">
        {devices.map((d) => {
          const s = status[d.id] ?? "unknown";
          const isOn = s === "online";
          return (
            <div key={d.id} className="flex items-center gap-3 py-2.5">
              <span
                className={`status-dot shrink-0 ${
                  isOn ? "status-dot-on" : s === "offline" ? "status-dot-off" : "opacity-40"
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-sm">{d.cpu}</span>
                  <span
                    className={`text-[10px] font-mono uppercase tracking-wider ${
                      isOn ? "text-online" : s === "offline" ? "text-offline" : "text-muted-foreground"
                    }`}
                  >
                    {isOn ? "Online" : s === "offline" ? "Offline" : "…"}
                  </span>
                </div>
                <div className="font-mono text-[11px] text-muted-foreground truncate">{d.ip}</div>
              </div>
              <div className="flex items-center gap-1">
                <IconBtn
                  title={isOn ? "Send file from this device" : "Device offline"}
                  disabled={!isOn}
                  onClick={() => onTransfer(d)}
                >
                  <Send className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn
                  title="Restart"
                  disabled={!isOn}
                  onClick={() => onSingleAction(d, "restart")}
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn
                  title="Shutdown"
                  variant="destructive"
                  disabled={!isOn}
                  onClick={() => onSingleAction(d, "shutdown")}
                >
                  <Power className="h-3.5 w-3.5" />
                </IconBtn>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  title,
  variant = "secondary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  variant?: "secondary" | "destructive";
}) {
  return (
    <Button
      size="icon"
      variant={variant}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="h-7 w-7"
    >
      {children}
    </Button>
  );
}
