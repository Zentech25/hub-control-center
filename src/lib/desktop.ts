// =========================================================================
// BACKEND INTEGRATION POINT — Exit desktop application (Tauri)
// =========================================================================
// This helper is used by the "Exit to Desktop" buttons on the Login page
// and inside the authenticated app shell. In the packaged Tauri desktop
// build the window is BORDERLESS (no native close button), so the user
// needs an in-app affordance to quit the application.
//
// CLAUDE: When wiring up Tauri, replace the body of `exitDesktopApp` with:
//
//   import { getCurrentWindow } from "@tauri-apps/api/window";
//   // or, to fully terminate the process:
//   // import { exit } from "@tauri-apps/plugin-process";
//
//   export async function exitDesktopApp() {
//     try {
//       // Preferred: close the main window (lets Tauri run cleanup hooks)
//       await getCurrentWindow().close();
//       // Or hard-exit the process:
//       // await exit(0);
//     } catch (e) {
//       console.error("Failed to exit desktop app", e);
//     }
//   }
//
// Also make sure `tauri.conf.json` has the window listed with
// `"decorations": false` (borderless) and that the `process` / `window`
// allowlist permits `close` (and `exit` if you use the process plugin).
//
// In the browser (dev / web preview) there is no host process to quit, so
// we fall back to `window.close()` which only works for windows opened by
// script — otherwise we just no-op with a console warning. That's fine,
// the button is really meant for the desktop build.
// =========================================================================
export async function exitDesktopApp(): Promise<void> {
  if (typeof window === "undefined") return;

  // Detect Tauri runtime (v1: __TAURI__, v2: __TAURI_INTERNALS__).
  const w = window as unknown as {
    __TAURI__?: unknown;
    __TAURI_INTERNALS__?: unknown;
  };
  const isTauri = Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__);

  if (isTauri) {
    // CLAUDE: swap this for a real static import once `@tauri-apps/api` is
    // added to the desktop build's dependencies:
    //   import { getCurrentWindow } from "@tauri-apps/api/window";
    //   await getCurrentWindow().close();
    // The indirection below hides the specifier from Vite's dep scanner so
    // the web build doesn't 500 trying to resolve a package that isn't
    // installed yet.
    try {
      const specifier = "@tauri-apps/api/window";
      const mod = await (new Function("s", "return import(s)") as (s: string) => Promise<{
        getCurrentWindow: () => { close: () => Promise<void> };
      }>)(specifier);
      await mod.getCurrentWindow().close();
      return;
    } catch (e) {
      console.error("Tauri exit failed, falling back to window.close()", e);
    }
  }


  // Web fallback — usually a no-op unless this window was script-opened.
  window.close();
}
