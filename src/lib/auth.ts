// =========================================================================
// BACKEND INTEGRATION POINT — Authentication
// =========================================================================
// Replace this in-memory/sessionStorage stub with a Tauri command that
// validates against the operator's directory (LDAP/AD) or a local user db.
//
//   import { invoke } from "@tauri-apps/api/core";
//   export async function login(u: string, p: string) {
//     return await invoke<{ token: string; user: string }>("login", { u, p });
//   }
// =========================================================================

const KEY = "ctn.session";

export interface Session {
  username: string;
  loginAt: number;
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export async function login(username: string, password: string): Promise<Session> {
  // Accept any non-empty credentials for now.
  if (!username.trim() || !password.trim()) {
    throw new Error("Username and password are required");
  }
  await new Promise((r) => setTimeout(r, 500));
  const session: Session = { username: username.trim(), loginAt: Date.now() };
  sessionStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

export function logout() {
  sessionStorage.removeItem(KEY);
}
