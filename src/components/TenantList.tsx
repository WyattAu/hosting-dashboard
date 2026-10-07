import { createResource, For, Show, createSignal } from "solid-js";
import type { Tenant } from "../lib/hosting-api";

async function fetchTenants(): Promise<Tenant[]> {
  const res = await fetch("/api/tenants");
  if (!res.ok) throw new Error(`tenants: ${res.status}`);
  return (await res.json()) as Tenant[];
}

export default function TenantList() {
  const [tenants, { refetch }] = createResource<Tenant[]>(fetchTenants);
  const [error, setError] = createSignal<string | null>(null);

  return (
    <section class="card">
      <h2>
        Tenants{" "}
        <button onClick={() => refetch()} disabled={tenants.loading}>
          {tenants.loading ? "…" : "Refresh"}
        </button>
      </h2>
      <Show when={!error()} fallback={<p class="status-pill status-down">{error()}</p>}>
        <table>
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Service</th>
              <th>Domain</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <For each={tenants() ?? []}>
              {(t) => (
                <tr>
                  <td class="mono">{t.tenant}</td>
                  <td>{t.service}</td>
                  <td class="mono">{t.domain}</td>
                  <td>
                    <span
                      class={`status-pill ${
                        t.status.healthy
                          ? "status-healthy"
                          : t.status.up > 0
                            ? "status-down"
                            : "status-degraded"
                      }`}
                    >
                      {t.status.healthy
                        ? "healthy"
                        : t.status.up > 0
                          ? `${t.status.degraded} degraded`
                          : "down"}
                    </span>
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
        <Show when={(tenants() ?? []).length === 0 && !tenants.loading}>
          <p class="muted">No tenants provisioned yet.</p>
        </Show>
      </Show>
    </section>
  );
}
