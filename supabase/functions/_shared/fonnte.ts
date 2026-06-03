export interface FonnteResult {
  ok: boolean;
  status: number;
  response: string;
}

export async function sendWhatsApp(target: string, message: string): Promise<FonnteResult> {
  const token = Deno.env.get("FONNTE_TOKEN");

  if (!token) {
    if (Deno.env.get("ALLOW_DEBUG_OTP") === "true") {
      return {
        ok: true,
        status: 200,
        response: "Debug mode: FONNTE_TOKEN not configured.",
      };
    }

    throw new Error("FONNTE_TOKEN belum dikonfigurasi.");
  }

  const body = new FormData();
  body.append("target", target);
  body.append("message", message);

  const response = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: token,
    },
    body,
  });

  return {
    ok: response.ok,
    status: response.status,
    response: await response.text(),
  };
}
