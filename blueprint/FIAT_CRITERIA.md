# Fiat criteria — +234 OTP → signed relay → CRE

CRE is the **payout-on-criteria** engine: AUSD stays in escrow until an off-chain condition is proven inside the TEE, then `writeReport` releases (or reclaim after 15m).

## Flow (PayPal-style webhook gate)

```
1. Payer verifies +234 via Termii OTP (or mock OTP if TERMII_API_KEY unset)
2. Verify callback mints a phone session token
3. openPayment locks AUSD → PaymentOpened
4. App POSTs /api/fiat/attest { paymentId, sessionToken }  ← truth gate
5. Relay HMAC-signs attestation (FIAT_RELAY_AUTH_TOKEN)
6. CRE GET /api/fiat/attest?paymentId=… with Bearer token
7. TEE verifies HMAC; only then approved=true → writeReport → release
```

Missing / expired attestation → CRE **skips** `writeReport` (retry via cron).  
Forged MAC → `approved=false` (fail-closed reject).

## Nigeria phone send

Recipient field accepts `@alice` **or** `+2348012345678` (opaque `handle:234801…` commit). Recipient must still register that handle on PhoneResolver.

## Ops

| Env | Role |
| --- | --- |
| `FIAT_RELAY_AUTH_TOKEN` | Shared HMAC + CRE GET auth (Next + CRE vault) |
| `TERMII_API_KEY` | Live SMS; omit → mock OTP with `demoPin` |
| `fiatRelayUrl` in CRE config | **Public HTTPS** attest URL (DON cannot hit localhost) |

## Honest limits

- Mock OTP is for local demo without Termii keys — same cryptographic path.
- Self-hosted relay is the issuer; CRE verification is load-bearing.
- Not a claim of CBN licensing or production mobile-money rails.
