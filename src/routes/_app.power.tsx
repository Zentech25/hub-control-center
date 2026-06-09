import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Power, AlertTriangle, Loader2, Search } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DEVICES, CATEGORIES, shutdownDevice } from "@/lib/devices";
import { useDeviceStatus } from "@/hooks/use-device-status";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/power")({
  head: () => ({ meta: [{ title: "Power Control — CTN Indoor Control" }] }),
  component: PowerPage,
});

function PowerPage() {
  const { status } = useDeviceStatus();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return DEVICES.filter((d) => {
      if (cat !== "all" && d.category !== cat) return false;
      if (status[d.id] !== "online") return false;
      if (!query) return true;
      return (
        d.unit.toLowerCase().includes(query) ||
        d.cpu.toLowerCase().includes(query) ||
        d.ip.toLowerCase().includes(query)
      );
    });
  }, [q, cat, status]);

  const allSelected = list.length > 0 && list.every((d) => selected.has(d.id));

  function toggle(id: number) {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSelected((prev) => {
      const n = new Set(prev);
      if (allSelected) list.forEach((d) => n.delete(d.id));
      else list.forEach((d) => n.add(d.id));
      return n;
    });
  }

  async function executeShutdown() {
    setRunning(true);
    const targets = DEVICES.filter((d) => selected.has(d.id));
    try {
      await Promise.all(targets.map((d) => shutdownDevice(d.ip)));
      toast.success(`Shutdown sent to ${targets.length} endpoint${targets.length === 1 ? "" : "s"}`);
      setSelected(new Set());
      setConfirmOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Power Control</h1>
          <p className="text-sm text-muted-foreground">
            Select one or many online endpoints to issue a remote shutdown.
          </p>
        </div>
        <Button
          variant="destructive"
          disabled={selected.size === 0}
          onClick={() => setConfirmOpen(true)}
          className="font-mono uppercase tracking-widest"
        >
          <Power className="mr-2 h-4 w-4" />
          Shutdown {selected.size > 0 ? `(${selected.size})` : ""}
        </Button>
      </div>

      <div className="panel flex flex-wrap items-center gap-3 p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search online endpoints…"
            className="pl-9"
          />
        </div>
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
        <Button variant="secondary" onClick={toggleAll} disabled={list.length === 0}>
          {allSelected ? "Clear selection" : "Select all"}
        </Button>
      </div>

      <div className="panel divide-y divide-border">
        <div className="grid grid-cols-[36px_1fr_140px_120px_180px] items-center gap-3 px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <div></div>
          <div>Unit / CPU</div>
          <div>Category</div>
          <div>Status</div>
          <div>IP Address</div>
        </div>
        {list.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No online endpoints match the filters.
          </div>
        ) : (
          list.map((d) => (
            <motion.label
              key={d.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid cursor-pointer grid-cols-[36px_1fr_140px_120px_180px] items-center gap-3 px-4 py-3 text-sm hover:bg-sidebar-accent/40"
            >
              <Checkbox
                checked={selected.has(d.id)}
                onCheckedChange={() => toggle(d.id)}
              />
              <div className="min-w-0">
                <div className="truncate font-mono text-sm">{d.unit}</div>
                <div className="text-xs text-muted-foreground">{d.cpu}</div>
              </div>
              <div className="text-xs text-muted-foreground">{d.category}</div>
              <div>
                <Badge variant="outline" className="border-online/40 font-mono text-[10px] text-online">
                  <span className="status-dot status-dot-on mr-1.5" /> Online
                </Badge>
              </div>
              <div className="font-mono text-xs">{d.ip}</div>
            </motion.label>
          ))
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm batch shutdown
            </DialogTitle>
            <DialogDescription>
              You are about to power down {selected.size} workstation
              {selected.size === 1 ? "" : "s"}. This action cannot be undone
              from the console.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={running} onClick={executeShutdown}>
              {running ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Power className="mr-2 h-4 w-4" />
              )}
              Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
