export function generateOtp(): string {
  const random = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(random).padStart(6, "0");
}

export async function hashOtp(code: string, nomorWa: string): Promise<string> {
  const secret =
    Deno.env.get("OTP_HASH_SECRET") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    "local-development-secret";
  const data = new TextEncoder().encode(`${nomorWa}.${code}.${secret}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);  
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function signJwt(payload: Record<string, unknown>): Promise<string> {
  const secret = Deno.env.get("SUPABASE_JWT_SECRET");
  if (!secret) {
    throw new Error("SUPABASE_JWT_SECRET belum dikonfigurasi.");
  }

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = base64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`));

  return `${encodedHeader}.${encodedPayload}.${base64Url(new Uint8Array(signature))}`;
}
