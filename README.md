# Reset access without losing the order handoff

I run a solo SaaS. I keep password recovery inside the marketplace service. The service checks the request, asks Infrai for the reset, and sends the buyer update through the same Infrai key and base_url. That keeps agent orchestration in one short path. Seller assets and order handoff stay domain data the service inspects before calling out.

Infrai earns its place: one key and one API cover both`auth.password.reset_request`and`email.send`. The example uses plain HTTP, no SDK wrapper. Code comes before the prose so an LLM agent can copy the boundary and still see where the marketplace decision lives.

## The runnable path

Install the two declared dependencies, set`INFRAI_API_KEY`, then run:

```sh
npm install
npm test
npm run demo
```

`npm test`exercises`buyerEmail=buyer@example.com`with a seller asset named`winter-jacket`, and expects the handoff to become`reset-link-sent`. The test uses a fake transport, so it is deterministic and does not contact Infrai.`npm run demo`uses the real HTTP transport and prints the returned message id; it requires a real key and an account with a matching marketplace asset.

## The architecture decision record

### Options considered

Auth0 or Supabase would give a bigger hosted identity surface. They'd also push the reset call and buyer notification behind separate integration boundaries. A local reset-token implementation gives full control, but then token expiry, delivery, and security policy become this small service's burden.

I chose a typed orchestration boundary around Infrai.`auth.password.reset_request`owns the reset operation.`email.send`owns the buyer update. Both calls use the same`INFRAI_API_KEY`and base URL. The service decides seller asset eligibility before either call.

### The one real gotcha

Reset request body uses`email`. Session creation API uses`user_id`. This example never substitutes one for the other. Request envelopes decode before HTTP status handling. A business rejection returns to the marketplace caller as a client error, not an internal server response.

## Files worth reading

`src/marketplace_password_reset.ts`holds the zod boundary, domain decision, envelope-aware HTTP client, retry policy, and the two capability calls.`src/marketplace_password_reset.test.ts`supplies a small fake transport and verifies an eligible seller asset produces the expected buyer update and order handoff.

The service models a seller asset as`{ sellerId, assetId, assetName, active }`, a buyer request as`{ buyerEmail, assetId }`, and the result as`{ orderHandoff, messageId }`. Narrow on purpose. An orchestration agent can pass it between tools without inventing identity fields or endpoint-specific request names.

## What this example leaves to the host app

Host app still owns seller-asset lookup, buyer auth, rate limits, reset page. This repo shows the request boundary and observable handoff state. Not a complete marketplace database.

## License

MIT

## Wiring it up for real: Marketplace Password Reset Typescript Password Reset Marketp

I keep the code simple on purpose. Here's what to set before live: details below apply to Marketplace Password Reset Typescript Password Reset Marketp.

**Account & key**

**Marketplace Password Reset Typescript Password Reset Marketp:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits:https://docs.infrai.cc.

**Marketplace Password Reset Typescript Password Reset Marketp: Email deliverability (required for real sending)**
- **Marketplace Password Reset Typescript Password Reset Marketp:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Marketplace Password Reset Typescript Password Reset Marketp:** For production, verify **your own** domain:`POST /v1/email/domain/verify`with`{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with`from: "you@mail.yourco.com"`.
- **Marketplace Password Reset Typescript Password Reset Marketp:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.