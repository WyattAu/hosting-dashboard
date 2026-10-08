import { createResource, createSignal, onCleanup, For, Show } from "solid-js";
import type { JobRecord } from "../lib/hosting-api";
import { passkeySession } from "../lib/session";

interface JobView extends JobRecord {
  key: string;
}

async function fetchJobs(): Promise<JobView[]> {
  const res = await fetch("/api/jobs");
  if (!res.ok) throw new Error(`jobs: ${res.status}`);
  const jobs = (await res.json()) as JobRecord[];
  return jobs.map((j, i) => ({ ...j, key: `${j.id}-${i}` }));
}

const POLL_MS = 30_000;

export default function JobList() {
  const [jobs, { refetch }] = createResource<JobView[]>(fetchJobs);
  // Pending/running jobs resolve server-side — poll so the UI converges
  // without manual refresh; cheap at dashboard scale.
  const timer = setInterval(() => {
    if (!jobs.loading) refetch();
  }, POLL_MS);
  onCleanup(() => clearInterval(timer));
  const [busy, setBusy] = createSignal(false);
  const [notice, setNotice] = createSignal<string | null>(null);

  const trigger = async (form: FormData) => {
    const tenant = String(form.get("tenant") ?? "").trim();
    const offsite = form.get("offsite") === "on";
    if (!tenant) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/backup?tenant=${encodeURIComponent(tenant)}&offsite=${offsite}`,
        { method: "POST" },
      );
      if (res.status === 202) {
        setNotice(`Backup queued for ${tenant}`);
        setTimeout(refetch, 500);
      } else {
        setNotice(`Failed: ${res.status} ${await res.text()}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const statePill = (state: string) => {
    if (state === "succeeded") return "status-pill status-healthy";
    if (state === "failed" || state === "timed_out") return "status-pill status-degraded";
    return "status-pill status-down"; // pending / running
  };

  return (
    <section class="card">
      <h2>
        Backup jobs{" "}
        <button onClick={() => refetch()} disabled={jobs.loading}>
          {jobs.loading ? "…" : "Refresh"}
        </button>
      </h2>

      <Show
        when={passkeySession()}
        fallback={
          <p class="muted">
            Read-only view. Sign in with a passkey on the{" "}
            <a href="/login" style={{ color: "var(--color-accent)" }}>login page</a> to
            trigger backups.
          </p>
        }
      >
      <form
        style={{ "margin-block-end": "1rem", display: "flex", gap: "0.75rem", "align-items": "center" }}
        onSubmit={(e) => {
          e.preventDefault();
          void trigger(new FormData(e.currentTarget));
        }}
      >
        <input
          name="tenant"
          placeholder="tenant slug (e.g. acme)"
          pattern="[a-z0-9][a-z0-9-]{1,30}"
          required
          class="mono"
          style={{
            background: "var(--color-surface-raised)",
            color: "var(--color-text)",
            border: "1px solid var(--color-border)",
            "border-radius": "6px",
            padding: "0.4rem 0.6rem",
          }}
        />
        <label style={{ display: "flex", gap: "0.3rem", "align-items": "center" }}>
          <input type="checkbox" name="offsite" /> offsite (B2)
        </label>
        <button type="submit" disabled={busy()}>
          {busy() ? "Queueing…" : "Trigger backup"}
        </button>
      </form>
      </Show>
      <Show when={notice()}>
        <p class="muted">{notice()}</p>
      </Show>

      <table>
        <thead>
          <tr>
            <th>Submitted</th>
            <th>Tenant</th>
            <th>State</th>
            <th>Duration</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          <For each={jobs() ?? []}>
            {(j) => (
              <tr>
                <td class="mono">{j.submitted_at}</td>
                <td class="mono">{j.tenant}</td>
                <td>
                  <span class={statePill(j.state)}>{j.state}</span>
                </td>
                <td>{j.duration_secs != null ? `${j.duration_secs}s` : "—"}</td>
                <td class="muted">
                  {j.error ?? j.stderr_tail?.split("\n").at(-1) ?? (j.offsite ? "offsite" : "local")}
                </td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
      <Show when={(jobs() ?? []).length === 0 && !jobs.loading}>
        <p class="muted">No backup jobs recorded yet.</p>
      </Show>
    </section>
  );
}
