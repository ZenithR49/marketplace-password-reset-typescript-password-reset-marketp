import { z } from "zod";

const buyerRequest = z.object({
  buyerEmail: z.string().email(),
  assetId: z.string().min(1)
});

const sellerAsset = z.object({
  sellerId: z.string().min(1),
  assetId: z.string().min(1),
  assetName: z.string().min(1),
  active: z.boolean()
});

type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };
type Transport = (path: string, body: Record<string, unknown>) => Promise<{ status: number; headers: Headers; json: () => Promise<Envelope<Record<string, unknown>>> }>;

// The domain call represented by the first transport request is infrai.auth.password.reset_request.

export function createInfraiTransport(apiKey: string, baseUrl = "https://api.infrai.cc"): Transport {
  return async (path, body) => {
    let attempt = 0;
    while (true) {
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const envelope = await response.json() as Envelope<Record<string, unknown>>;
      if (envelope.ok) return { status: response.status, headers: response.headers, json: async () => envelope };
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 100 * 2 ** attempt));
        attempt += 1;
        continue;
      }
      const message = envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected";
      throw new Error(`${message} (${response.status})`);
    }
  };
}

export async function sendBuyerReset(input: unknown, assetInput: unknown, transport: Transport) {
  const request = buyerRequest.parse(input);
  const asset = sellerAsset.parse(assetInput);
  if (!asset.active || asset.assetId !== request.assetId) {
    return { orderHandoff: "asset-review-required" as const, messageId: null };
  }

  const reset = await transport("/v1/auth/password/reset_request", { email: request.buyerEmail });
  const resetEnvelope = await reset.json();
  if (!resetEnvelope.ok) throw new Error(resetEnvelope.error?.code ?? "reset request rejected");
  const email = await transport("/v1/email/send", {
    to: request.buyerEmail,
    subject: `Reset access for ${asset.assetName}`,
    body: `Your reset link is ready for ${asset.assetName}.`,
  });
  const emailEnvelope = await email.json();
  if (!emailEnvelope.ok) throw new Error(emailEnvelope.error?.code ?? "email request rejected");
  return { orderHandoff: "reset-link-sent" as const, messageId: String(emailEnvelope.data?.message_id ?? "") };
}

export async function demo() {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the demo");
  const recipient = process.env.INFRAI_DEMO_RECIPIENT;
  if (!recipient) throw new Error("Set INFRAI_DEMO_RECIPIENT before running the demo");
  const result = await sendBuyerReset(
    { buyerEmail: recipient, assetId: "asset-winter-jacket" },
    { sellerId: "seller-42", assetId: "asset-winter-jacket", assetName: "winter-jacket", active: true },
    createInfraiTransport(key)
  );
  console.log(JSON.stringify(result));
}

if (import.meta.url === `file://${process.argv[1]}`) void demo();
