import { createSignal } from "solid-js";

/**
 * Shared passkey-session signal, persisted to sessionStorage so a reload
 * keeps the session visible. hosting-api's /me endpoint is the authority;
 * this only drives UI gating (read-only vs. mutating controls).
 */
const KEY = "pk-session";
const [session, setSession] = createSignal<string | null>(sessionStorage.getItem(KEY));

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
