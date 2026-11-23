import { createSignal } from "solid-js";

/**
 * Shared passkey-session signal, persisted to sessionStorage so a reload
 * keeps the session visible. hosting-api's /me endpoint is the authority;
 * this only drives UI gating (read-only vs. mutating controls).
 */
const KEY = "pk-session";
// SSR guard: this module is also evaluated on the server during prerender
// (found 2026-11-23: every route 500'd with "sessionStorage is not
// defined" once the artifact ran under node — dev mode never caught it
// because only the client entry executed this path).
const [session, setSession] = createSignal<string | null>(
  typeof sessionStorage === "undefined" ? null : sessionStorage.getItem(KEY),
);

export function setPasskeySession(token: string | null): void {
  if (token) {
    sessionStorage.setItem(KEY, token);
  } else {
    sessionStorage.removeItem(KEY);
  }
  setSession(token);
}

export function passkeySession(): string | null {
  return session();
}
