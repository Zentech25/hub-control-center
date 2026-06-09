import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, FileUp, Loader2, Send, CheckCircle2, Monitor, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEVICES, transferFile } from "@/lib/devices";
import { useDeviceStatus } from "@/hooks/use-device-status";
import { toast } from "sonner";

interface Search {
  source?: string;
}

export const Route = createFileRoute("/_app/transfer")({
  head: () => ({ meta: [{ title: "File Transfer — CTN Indoor Control" }] }),
  validateSearch: (s: Record<string, unknown>): Search => ({
    source: typeof s.source === "string" ? s.source : undefined,
  }),
  component: TransferPage,
});

function TransferPage() {
  const { source: initial } = Route.useSearch();
  const { status } = useDeviceStatus();
  const [source, setSource] = useState<string>(initial ?? "");
  const [dest, setDest] = useState<string>("");
  const [filePath, setFilePath] = useState<string>("");
  const [destPath, setDestPath] = useState<string>("C:\\Incoming\\");
  const [pct, setPct] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const onlineDevices = useMemo(
    () => DEVICES.filter((d) => status[d.id] === "online"),
    [status],
  );

  const sourceDev = DEVICES.find((d) => String(d.id) === source);
  const destDev = DEVICES.find((d) => String(d.id) === dest);

  async function onTransfer() {
    if (!sourceDev || !destDev) return toast.error("Select source and destination");
    if (sourceDev.id === destDev.id)
      return toast.error("Source and destination must differ");
    if (!filePath.trim()) return toast.error("Specify a file path on source");
    setRunning(true);
    setDone(false);
    setPct(0);
    try {
      await transferFile({
        sourceIp: sourceDev.ip,
        destIp: destDev.ip,
        filePath: filePath.trim(),
        destPath: destPath.trim(),
        onProgress: setPct,
      });
      setDone(true);
      toast.success("Transfer complete");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">File Transfer</h1>
        <p className="text-sm text-muted-foreground">
          Push a file from one workstation in the hub to another. Only online
          endpoints are eligible.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <EndpointPicker
          label="Source"
          value={source}
          onChange={setSource}
          devices={onlineDevices}
        />
        <div className="flex items-center justify-center">
          <motion.div
            animate={running ? { x: [0, 16, 0] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <ArrowRight className="h-5 w-5" />
          </motion.div>
        </div>
        <EndpointPicker
          label="Destination"
          value={dest}
          onChange={setDest}
          devices={onlineDevices}
        />
      </div>

      <div className="panel grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="src-path">Source file path</Label>
          <div className="flex gap-2">
            <Input
              id="src-path"
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              placeholder="C:\Data\report.bin"
              className="font-mono"
            />
            {/* =====================================================================
                BACKEND INTEGRATION POINT — Remote file browser (Tauri / Rust)
                =====================================================================
                CLAUDE: This button must open a file-explorer dialog ON THE SELECTED
                SOURCE HOST (not on the operator's local machine). The source is a
                remote workstation, so we cannot use the browser's <input type=file>
                or Tauri's local `dialog.open` directly.
            
                Recommended approach:
                  1. Expose a Tauri command `list_remote_dir(ip, path)` that returns
                     `{ entries: [{ name, isDir, size, modified }], parent }`.
                     Implementation options on the Rust side:
                       - SMB    : `pavao` / `smb` crate (Windows targets)
                       - SSH/SFTP: `ssh2` / `russh-sftp` (Linux targets)
                       - Custom agent: small companion service on each host that
                         exposes an authenticated HTTP/gRPC dir-listing endpoint.
                  2. Build a modal "remote file browser" component that calls the
                     above command, lets the operator navigate folders on
                     `sourceDev.ip`, and on selection writes the chosen absolute
                     path back into `setFilePath(...)`.
                  3. Disable this button until a source endpoint is picked, and
                     pass `sourceDev.ip` into the dialog so the right host is browsed.
                  4. Re-use the same dialog (with `destDev.ip`) for the destination
                     path picker if you want a symmetric UX.
            
                Until backend integration lands this button is a no-op stub.
                ===================================================================== */}
            <Button
              variant="secondary"
              type="button"
              title="Browse files on the source host (requires Tauri backend)"
              disabled={!sourceDev}
              onClick={() => {
                // TODO(claude): open remote file browser for sourceDev.ip
                // and call setFilePath(selectedAbsolutePath) on confirm.
                toast.message("Remote file browser is wired up in the desktop build.");
              }}
            >
              <FileUp className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Path is resolved on the source host.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dst-path">Destination path</Label>
          <Input
            id="dst-path"
            value={destPath}
            onChange={(e) => setDestPath(e.target.value)}
            placeholder="C:\Incoming\"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Directory on the destination host. File name is preserved.
          </p>
        </div>
      </div>

      {(running || done) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="panel space-y-4 p-5"
        >
          <TransferAnimation
            pct={pct}
            done={done}
            sourceLabel={sourceDev?.unit ?? "Source"}
            destLabel={destDev?.unit ?? "Destination"}
          />
          <div className="flex items-center justify-between font-mono text-sm">
            <span>{done ? "Complete" : "Transferring…"}</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} />
          {done && (
            <div className="flex items-center gap-2 text-sm text-online">
              <CheckCircle2 className="h-4 w-4" />
              File delivered to {destDev?.unit} ({destDev?.ip}).
            </div>
          )}
        </motion.div>
      )}


      <div className="flex justify-end">
        <Button onClick={onTransfer} disabled={running} className="font-mono uppercase tracking-widest">
          {running ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {running ? "Sending" : "Start Transfer"}
        </Button>
      </div>
    </div>
  );
}

function TransferAnimation({
  pct,
  done,
  sourceLabel,
  destLabel,
}: {
  pct: number;
  done: boolean;
  sourceLabel: string;
  destLabel: string;
}) {
  // Position is driven directly by progress so the flying file stays in
  // sync with the actual byte-transfer percentage. Inset keeps it between
  // the two PC icons (roughly 12% → 88% of the track).
  const x = `calc(${12 + (pct / 100) * 76}% - 14px)`;

  return (
    <div className="relative h-24 w-full overflow-hidden rounded-md border border-border/60 bg-background/40">
      {/* Animated dashed transmission line */}
      <div className="absolute left-[14%] right-[14%] top-1/2 h-px -translate-y-1/2 overflow-hidden">
        <motion.div
          className="h-full w-[200%] bg-[linear-gradient(to_right,transparent_0,transparent_6px,hsl(var(--primary)/0.55)_6px,hsl(var(--primary)/0.55)_14px)]"
          animate={done ? { x: 0 } : { x: ["0%", "-50%"] }}
          transition={{ duration: 1.2, repeat: done ? 0 : Infinity, ease: "linear" }}
        />
      </div>

      {/* Source PC */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
        <motion.div
          animate={done ? {} : { boxShadow: ["0 0 0 0 hsl(var(--primary)/0.4)", "0 0 0 8px hsl(var(--primary)/0)"] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary"
        >
          <Monitor className="h-5 w-5" />
        </motion.div>
        <span className="max-w-[90px] truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {sourceLabel}
        </span>
      </div>

      {/* Destination PC */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1">
        <motion.div
          animate={done ? { scale: [1, 1.15, 1] } : {}}
          transition={{ duration: 0.6 }}
          className={`flex h-10 w-10 items-center justify-center rounded-md ${
            done ? "bg-online/20 text-online" : "bg-accent/15 text-accent"
          }`}
        >
          <Monitor className="h-5 w-5" />
        </motion.div>
        <span className="max-w-[90px] truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {destLabel}
        </span>
      </div>

      {/* Flying file packet */}
      {!done && (
        <motion.div
          className="absolute top-1/2 -translate-y-1/2"
          style={{ left: x }}
          animate={{ y: ["-50%", "-65%", "-50%"] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-full bg-primary/40 blur-md" />
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-lg">
              <FileText className="h-4 w-4" />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}



function EndpointPicker({
  label,
  value,
  onChange,
  devices,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  devices: typeof DEVICES;
}) {
  const dev = DEVICES.find((d) => String(d.id) === value);
  return (
    <div className="panel space-y-3 p-5">
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select an online endpoint" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {devices.length === 0 && (
            <div className="px-2 py-3 text-sm text-muted-foreground">
              No endpoints online
            </div>
          )}
          {devices.map((d) => (
            <SelectItem key={d.id} value={String(d.id)}>
              <span className="font-mono text-xs">
                {d.unit} · {d.cpu} · {d.ip}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {dev && (
        <div className="rounded-md border border-border/60 bg-background/40 p-3 font-mono text-xs">
          <div className="text-foreground">{dev.unit}</div>
          <div className="text-muted-foreground">{dev.category} · {dev.cpu}</div>
          <div className="mt-1 text-foreground">{dev.ip}</div>
        </div>
      )}
    </div>
  );
}
