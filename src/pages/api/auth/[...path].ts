import type { APIRoute } from "astro";
import { ApiError } from "../../../lib/hosting-api";

const BASE = process.env.HOSTING_API_URL ?? "http://127.0.0.1:8484";
const TOKEN = process.env.HOSTING_API_TOKEN ?? "";

/**
 * Pass-through for the hosting-api passkey ceremonies. Bearer auth is NOT
 * required for these (login must be public; registration enforces its own
 * bootstrap rule inside hosting-api), but the platform token is injected
 * so hosting-api can authorise later registrations via bearer_matches.
 */
export const POST: APIRoute = async ({ params, request }) => {
  // params.path captures "passkey/register/begin" etc.
  const sub = (params.path ?? "").replace(/^passkey\//, "");
  if (!/^(register|login)\/(begin|finish)$/.test(sub)) {
    return new Response(JSON.stringify({ error: "unknown ceremony" }), { status: 404 });
  }
  const body = await request.text();
  try {
    const res = await fetch(`${BASE}/api/auth/passkey/${sub}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: body || "{}",
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 502;
    return new Response(JSON.stringify({ error: String(err) }), { status });
  }
};
