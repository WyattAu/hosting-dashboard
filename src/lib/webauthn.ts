/**
 * Browser-side WebAuthn wire helpers.
 *
 * hosting-api's DTOs speak base64url strings (webauthn-kit convention);
 * the browser's navigator.credentials API speaks ArrayBuffers. This module
 * is the translation layer, plus the two ceremony wrappers.
 */

function bufToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function b64urlToBuf(value: string): ArrayBuffer {
  const b64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export interface CredentialCreationOptionsJSON {
  rp: { id: string; name: string };
  user: { id: string; name: string; displayName: string };
  challenge: string;
  pubKeyCredParams: { alg: number; type: "public-key" }[];
  timeout?: number;
  excludeCredentials?: { id: string; type: string }[];
  authenticatorSelection?: Record<string, unknown>;
  attestation?: string;
}

export interface CredentialRequestOptionsJSON {
  challenge: string;
  rpId: string;
  allowCredentials: { id: string; type: string }[];
  timeout?: number;
  userVerification?: string;
}

export interface RegistrationResponseJSON {
  client_data_json: string;
  attestation_object: string;
  transports: string[];
}

export interface AuthenticationResponseJSON {
  id: string;
  client_data_json: string;
  authenticator_data: string;
  signature: string;
  user_handle: string | null;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/auth/passkey/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as T & { error?: unknown };
  if (!res.ok) {
    throw new Error(`passkey ${path}: ${res.status}`);
  }
  return json;
}

/// Registration ceremony: create() against hosting-api's options, encode
/// the browser response, and return hosting-api's verification result.
export async function registerPasskey(username: string): Promise<unknown> {
  const begin = await post<{ challenge_id: string; options: CredentialCreationOptionsJSON }>(
    "register/begin",
    { username },
  );

  const opts = begin.options;
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: b64urlToBuf(opts.challenge),
      rp: opts.rp,
      user: {
        ...opts.user,
        id: b64urlToBuf(opts.user.id),
      },
      pubKeyCredParams: opts.pubKeyCredParams,
      timeout: opts.timeout,
      excludeCredentials: opts.excludeCredentials?.map((c) => ({
        type: "public-key" as const,
        id: b64urlToBuf(c.id),
      })),
      authenticatorSelection: opts.authenticatorSelection,
      attestation: (opts.attestation ?? "none") as AttestationConveyancePreference,
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("no credential returned by the authenticator");

  const response = credential.response as AuthenticatorAttestationResponse;
  return post("register/finish", {
    username,
    challenge_id: begin.challenge_id,
    response: {
      client_data_json: bufToB64url(response.clientDataJSON),
      attestation_object: bufToB64url(response.attestationObject),
      transports: response.getTransports?.() ?? [],
    } satisfies RegistrationResponseJSON,
  });
}

/// Authentication ceremony: get() then encode the assertion.
export async function loginPasskey(username: string): Promise<{ session: string; username: string }> {
  const begin = await post<{ challenge_id: string; options: CredentialRequestOptionsJSON }>(
    "login/begin",
    { username },
  );

  const opts = begin.options;
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: b64urlToBuf(opts.challenge),
      rpId: opts.rpId,
      allowCredentials: opts.allowCredentials?.map((c) => ({
        type: "public-key" as const,
        id: b64urlToBuf(c.id),
      })),
      timeout: opts.timeout,
      userVerification: (opts.userVerification ?? "required") as UserVerificationRequirement,
    },
  })) as PublicKeyCredential | null;
  if (!assertion) throw new Error("no assertion returned by the authenticator");

  const response = assertion.response as AuthenticatorAssertionResponse;
  return post("login/finish", {
    username,
    challenge_id: begin.challenge_id,
    response: {
      id: assertion.id,
      client_data_json: bufToB64url(response.clientDataJSON),
      authenticator_data: bufToB64url(response.authenticatorData),
      signature: bufToB64url(response.signature),
      user_handle: response.userHandle ? bufToB64url(response.userHandle) : null,
    } satisfies AuthenticationResponseJSON,
  });
}
