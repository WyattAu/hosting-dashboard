import type { APIRoute } from "astro";
import { ApiError, triggerBackup } from "../../lib/hosting-api";

export const POST: APIRoute = async ({ url }) => {
  const tenant = url.searchParams.get("tenant");
  const offsite = url.searchParams.get("offsite") === "true";
  if (!tenant || !/^[a-z0-9][a-z0-9-]{1,30}$/.test(tenant)) {
    return new Response(JSON.stringify({ error: "invalid tenant" }), { status: 400 });
  }
  try {
    const result = await triggerBackup(tenant, offsite);
    return new Response(JSON.stringify(result), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    return new Response(JSON.stringify({ error: String(err) }), { status });
  }
};
