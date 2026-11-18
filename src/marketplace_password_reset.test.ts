import assert from "node:assert/strict";
import { sendBuyerReset } from "./marketplace_password_reset.ts";

const calls: Array<{ path: string; body: Record<string, unknown> }> = [];
const fakeTransport = async (path: string, body: Record<string, unknown>) => {
  calls.push({ path, body });
  const data = path.includes("email/send") ? { message_id: "msg-test-1" } : { accepted: true };
  return { status: 200, headers: new Headers(), json: async () => ({ ok: true, data }) };
};

const result = await sendBuyerReset(
  { buyerEmail: "buyer@example.com", assetId: "asset-winter-jacket" },
  { sellerId: "seller-42", assetId: "asset-winter-jacket", assetName: "winter-jacket", active: true },
  fakeTransport
);

assert.deepEqual(result, { orderHandoff: "reset-link-sent", messageId: "msg-test-1" });
assert.deepEqual(calls.map((call) => call.path), ["/v1/auth/password/reset_request", "/v1/email/send"]);
assert.deepEqual(calls[0].body, { email: "buyer@example.com" });
assert.equal(calls[1].body.to, "buyer@example.com");
console.log("eligible asset -> reset-link-sent");
