import type { APIRoute } from "astro";
import { ApiError, listTenants } from "../../lib/hosting-api";

export const GET: APIRoute = async () => {
  try {
    const tenants = await listTenants();
    return new Response(JSON.stringify(tenants), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    return new Response(JSON.stringify({ error: String(err) }), { status });
  }
};
