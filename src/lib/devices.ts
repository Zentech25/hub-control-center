import devicesJson from "@/data/devices.json";

export type DeviceStatus = "online" | "offline" | "unknown";

export interface Device {
  id: number;
  category: string;
  unit: string;
  cpu: string;
  ip: string;
}

export const DEVICES: Device[] = devicesJson as Device[];

export const CATEGORIES = Array.from(new Set(DEVICES.map((d) => d.category)));

// =========================================================================
// BACKEND INTEGRATION POINT (Tauri / Rust)
// =========================================================================
// Replace `mockPing` with a Tauri invoke that runs an ICMP ping or a TCP
// probe on the host machine. Example:
//
//   import { invoke } from "@tauri-apps/api/core";
//   export async function pingDevice(ip: string): Promise<DeviceStatus> {
//     return await invoke<DeviceStatus>("ping_device", { ip });
//   }
//
// The Rust side should expose a `#[tauri::command] ping_device(ip: String)`
// that returns "online" | "offline" using e.g. the `surge-ping` crate.
// =========================================================================
export async function mockPing(ip: string): Promise<DeviceStatus> {
  // Stable pseudo-random based on IP, with small jitter so things "flicker"
  const seed = ip.split(".").reduce((a, n) => a * 31 + Number(n || 0), 7);
  const rnd = Math.sin(seed + Date.now() / 20000) * 0.5 + 0.5;
  return rnd > 0.18 ? "online" : "offline";
}

// =========================================================================
// BACKEND INTEGRATION POINT — Shutdown
// =========================================================================
// export async function shutdownDevice(ip: string) {
//   return await invoke("shutdown_device", { ip });
// }
// Rust side: run `shutdown /s /t 0` on Windows via psexec/WinRM, or
// `ssh user@ip "sudo shutdown -h now"` on Linux targets.
// =========================================================================
export async function shutdownDevice(ip: string): Promise<{ ok: boolean }> {
  await new Promise((r) => setTimeout(r, 800));
  return { ok: true };
}

// =========================================================================
// BACKEND INTEGRATION POINT — File transfer
// =========================================================================
// export async function transferFile(opts: {
//   sourceIp: string; destIp: string; filePath: string; destPath: string;
// }) { return await invoke("transfer_file", opts); }
// Rust side: SMB / SCP / SFTP depending on target OS.
// =========================================================================
export async function transferFile(opts: {
  sourceIp: string;
  destIp: string;
  filePath: string;
  destPath: string;
  onProgress?: (pct: number) => void;
}): Promise<{ ok: boolean }> {
  for (let i = 0; i <= 100; i += 5) {
    await new Promise((r) => setTimeout(r, 60));
    opts.onProgress?.(i);
  }
  return { ok: true };
}
