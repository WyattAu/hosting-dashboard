/**
 * Server-side client for hosting-api.
 *
 * SECURITY BOUNDARY: HOSTING_API_TOKEN lives only in this process's
 * environment (injected by systemd from the SOPS-rendered platform
 * secrets). Browser code talks to /api/* routes in this app, which call
 * these functions server-side. The token never crosses the wire to a
 * browser.
 */

const BASE = process.env.HOSTING_API_URL ?? "http://127.0.0.1:8484";
const TOKEN = process.env.HOSTING_API_TOKEN ?? "";

export interface TenantStatus {
  services: number;
  up: number;
  degraded: number;
  healthy: boolean;
}

export interface Tenant {
  tenant: string;
  service: string;
  domain: string;
  local_url: string;
  initial_admin_user: string;
  status: TenantStatus;
}

export interface JobRecord {
  id: string;
  tenant: string;
  offsite: boolean;
  state: "pending" | "running" | "succeeded" | "failed" | "timed_out";
  submitted_at: string;
  finished_at: string | null;
  exit_code: number | null;
  stderr_tail: string | null;
  duration_secs: number | null;
  error: string | null;
}

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    throw new ApiError(
      `hosting-api unreachable at ${BASE}`,
      502,
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(
      `hosting-api ${res.status}: ${body.slice(0, 200)}`,
      res.status,
    );
  }
  return (await res.json()) as T;
}

export function listTenants(): Promise<Tenant[]> {
  return call<Tenant[]>("/api/tenants");
}

export function listJobs(tenant?: string): Promise<JobRecord[]> {
  const path = tenant ? `/api/tenants/${encodeURIComponent(tenant)}/jobs` : "/api/jobs";
  return call<JobRecord[]>(path);
}

export function triggerBackup(
  tenant: string,
  offsite: boolean,
): Promise<{ job_id: string }> {
  return call<{ job_id: string }>(
    `/api/tenants/${encodeURIComponent(tenant)}/backup?offsite=${offsite}`,
    { method: "POST" },
  );
}
