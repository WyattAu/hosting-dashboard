import type { APIRoute } from "astro";
import { ApiError, listJobs } from "../../lib/hosting-api";

export const GET: APIRoute = async ({ url }) => {
  const tenant = url.searchParams.get("tenant") ?? undefined;
  try {
    const jobs = await listJobs(tenant);
    return new Response(JSON.stringify(jobs), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    return new Response(JSON.stringify({ error: String(err) }), { status });
  }
};
