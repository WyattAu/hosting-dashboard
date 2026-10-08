import { createSignal, Show } from "solid-js";
import { loginPasskey, registerPasskey } from "../lib/webauthn";
import { passkeySession, setPasskeySession } from "../lib/session";

/**
 * Passkey setup + login island.
 *
 * Shown on the /login page. The bootstrap rule lives server-side
 * (hosting-api): the FIRST credential enrols with no prior auth; every
 * later registration requires a live session — so this UI only offers
 * "register" after a successful login, except on a fresh platform where
 * the register call succeeds because the credential store is empty.
 */
export default function PasskeySetup() {
  const [username, setUsername] = createSignal("");
  const session = passkeySession;
  const [message, setMessage] = createSignal<string | null>(null);
  const [busy, setBusy] = createSignal(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setMessage(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Ceremony cancelled or timed out."
          : String(err),
      );
    } finally {
      setBusy(false);
    }
  };

  const doRegister = () =>
    run(async () => {
      const result = (await registerPasskey(username())) as { credential_id: string };
      setMessage(`Passkey enrolled: ${String(result.credential_id).slice(0, 16)}…`);
    });

  const doLogin = () =>
    run(async () => {
      const result = await loginPasskey(username());
      setPasskeySession(result.session);
      setMessage(`Signed in as ${result.username}.`);
    });

  return (
    <section class="card">
      <h2>Passkey access</h2>
      <Show
        when={!session()}
        fallback={
          <p>
            Session active.{" "}
            <button
              onClick={() => {
                setPasskeySession(null);
              }}
            >
              Sign out
            </button>
          </p>
        }
      >
        <form
          style={{ display: "flex", gap: "0.75rem", "align-items": "center", "flex-wrap": "wrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            void doLogin();
          }}
        >
          <input
            required
            placeholder="username"
            value={username()}
            onInput={(e) => setUsername(e.currentTarget.value)}
            class="mono"
            style={{
              background: "var(--color-surface-raised)",
              color: "var(--color-text)",
              border: "1px solid var(--color-border)",
              "border-radius": "6px",
              padding: "0.4rem 0.6rem",
            }}
          />
          <button type="submit" disabled={busy()}>
            Sign in with passkey
          </button>
          <button type="button" disabled={busy()} onClick={() => void doRegister()}>
            Enroll passkey
          </button>
        </form>
        <p class="muted">
          On a fresh platform, "Enroll passkey" bootstraps the first
          credential. Later enrolments need an active session.
        </p>
      </Show>
      <Show when={message()}>
        <p class="muted mono">{message()}</p>
      </Show>
    </section>
  );
}
