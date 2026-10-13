# Metropolis submission — NonaPay (paste pack)

**Primary track:** Consumer Products & Payments  
**Repo:** https://github.com/emarc99/nonad-pay  
**Deadline:** 14 Oct, 04:59 GMT+1

## Still required before Submit

| Item | Status | Action |
| --- | --- | --- |
| Project details text | Ready below | Paste |
| Logo | Artifact ready | Upload `/opt/cursor/artifacts/nonapay-logo-square.png` (or `frontend/public/nonapay-logo.png`) |
| Live product HTTPS | Done | https://nonad-pay.vercel.app — CRE `fiatRelayUrl` pointed here; add Upstash Redis on Vercel for durable OTP/attest |
| Demo video ≤3 min | Blocker | Record working product |
| Pitch video ≤2 min | Blocker | Team + problem + why |
| Bounty answers | Ready below | Paste + links |

Tunnel `https://retrieve-workout-sensitivity-reason.trycloudflare.com` is **not** a stable judge URL.

---

## Project name

```
NonaPay
```

## Tagline (≤200)

```
Cash App for AUSD remittances on Monad — Mera passkeys, send to @handles, dual-exit escrow unlocked by Chainlink CRE.
```

## Describe your project

```
Problem
Cross-border remittances still feel like banking homework: seed phrases, 0x addresses, and “where did my money go?” Escrow that unlocks from a public watcher is not compliance. Senders and recipients need Cash App simplicity, dollar-stable settlement (AUSD), and a reclaim path if settlement stalls.

Solution
NonaPay is a consumer remittance app on Monad Testnet. Create a Mera passkey (Face ID / Touch ID / Google Password Manager), claim an @handle, drip test MON + Agora AUSD, verify +234 once per passkey, and send to @alice or a +234 handle. Funds lock in dual-exit escrow. A Chainlink CRE confidential workflow is the criteria engine: it fetches a signed +234 OTP attestation over HTTPS, verifies HMAC in the TEE with Vault secrets (ENCLAVE_NULLIFIER_SALT, FIAT_RELAY_AUTH_TOKEN), then settles via evm.writeReport → NonaRegistry.onReport. Missing attestation → no release (pending). Forged HMAC → approved=false / RejectedReport. Missing Vault secrets → execution failure. If CRE never releases, the payer reclaims after 15 minutes.

Why it is useful
• Invisible chain — passkeys and @handles, not seed phrases.
• Programmable money — CRE must see OTP-backed attestation before release.
• Safe failure — escrow never freezes forever; reclaim is first-class.
• Honest latency — Monad finality ~1s; CRE criteria is async seconds. We demo both.

Stack (Monad Testnet)
• Contracts: NonaGateway, P2PEscrow, PhoneResolver, NonaRegistry
• Frontend: Next.js + Mera WebAuthn/PRF (HD path: master index 0, spend index 1)
• CRE: private-registry workflow nonapay-remittance-staging (PaymentOpened log trigger + cron backup)
• Fiat criteria: Africa’s Talking sandbox / Termii / mock OTP → HMAC relay → CRE GET

Repo: https://github.com/emarc99/nonad-pay
```

## How will you reach your first users

```
First users
1) Diaspora senders who want a dollar-stable rail to Nigeria without teaching relatives MetaMask.
2) Monad / Agora / CRE builders who need a reference remittance UX on testnet.
3) Campus and creator communities with +234 phones and PRF-capable passkeys.

How we reach them
• Testnet product with in-app drip so a first send takes under ~3 minutes.
• Metropolis / Chainlink / Agora showcase and office hours as the first cohort.
• WhatsApp and X threads aimed at NG fintech: “send @handle, CRE unlocks escrow.”
• University builder workshops: passkey + @handle first, not Solidity first.
• After testnet proof: waitlist for mainnet corridors (airtime / school fees) with live NG OTP (Termii).
```

## Steps to try the product (private to judges)

```
Prerequisites
• Chrome/Edge with a PRF-capable passkey (Google Password Manager or platform authenticator).
• Open the HTTPS product URL (WebAuthn rejects raw IPs; use the hostname, not 127.0.0.1).
• Monad Testnet.

Steps
1. Open the live app.
2. Create / unlock passkey → Sign in (Mera).
3. Me → claim @yourname (or Link existing if restoring on a new device).
4. Me → +234… → Send OTP → Verify (sandbox may surface the code in-app; mock demoPin if no SMS provider).
5. Use in-app drip/faucet for MON + AUSD if needed.
6. Send → @alice (or another registered handle) → amount → Pay.
7. Wait for CRE settle (usually seconds via log trigger). Recipient AUSD updates.
8. Optional criteria demo: Pay on a passkey with no verified +234 → escrow locks, CRE stays pending, reclaim after 15m.

Contracts (Monad Testnet)
• NonaGateway 0x421dCd87dc70d07589CA51200bf5Ec6065C12b8c
• P2PEscrow 0x6C33f144264a480B3bd414Db39127deC91A3b69D
• NonaRegistry 0x9693aAd2540D75057D0CDce4c16891230D335A6B
• PhoneResolver 0x3953E210A6F81BBe5d9cAA0BD2Cc89dED255f95E
• AUSD 0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC

CRE workflow: nonapay-remittance-staging (private registry)
No shared password — each judge uses their own passkey.
```

## Demo video script (≤3 min)

1. Cold start: create passkey → signed in  
2. Me: claim handle + verify +234 OTP  
3. Drip funds  
4. Send $X to @alice → activity shows attest  
5. Cut to explorer / balance: Alice received; mention CRE SUCCESS  
6. Optional 20s: second passkey/no OTP → Pay → “Locked — CRE waiting on +234”

## Pitch video script (≤2 min)

• Who we are  
• Problem: remittance UX + fake “compliance watchers”  
• Solution: Cash App UX + AUSD + CRE criteria + 15m reclaim  
• Why Monad / Agora / Mera / Chainlink  
• Ask: try the live link

---

## Bounties

### Agora — Best Cross-Border Payments

**Answer**

```
NonaPay settles remittances in Agora AUSD on Monad Testnet with a Cash App-style send to @handles / +234 — not a swap UI. Onboarding is Mera passkeys. Payers fund AUSD, lock it in dual-exit escrow via NonaGateway, and Chainlink CRE releases only after +234 OTP attestation (HMAC-verified in TEE). That is a cross-border, criteria-gated dollar rail without claiming CBN licensing.

Evidence: live send using AUSD 0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC; repo https://github.com/emarc99/nonad-pay; demo video passkey → OTP → pay @alice → CRE release.
```

**Link:** `https://github.com/emarc99/nonad-pay`

### Chainlink — Best workflow with CRE

**Answer**

```
CRE is the settlement engine, not a watcher (anti-AquaGhost).

TEE / Vault
• Secrets: ENCLAVE_NULLIFIER_SALT, FIAT_RELAY_AUTH_TOKEN
• HTTP GET fiatRelayUrl attest; HMAC-SHA256 verify in TEE (@noble/hashes)
• Fail-closed: missing secrets / empty fiatRelayUrl / HTTP 401–5xx throw; forged MAC → writeReport approved=false → RejectedReport; missing attest → skip writeReport (pending) + 15m reclaim

Delivery
• Confidential handler + runtime.getSecret
• donRuntime → evm.writeReport → NonaRegistry.onReport (Keystone forwarder on Monad Testnet)
• Triggers: PaymentOpened log trigger + cron filterLogs backup
• Private registry: nonapay-remittance-staging

Proof: https://github.com/emarc99/nonad-pay/tree/main/workflow — plus live PaymentSettled / FundsReleased tx in the demo video description.
```

**Link:** `https://github.com/emarc99/nonad-pay/tree/main/workflow`

### Mera — Best Mera-Powered UX

**Answer**

```
Primary auth is Mera passkeys — no seed phrases. Sign-in is Face ID / Touch ID / GPM passkey; the send keypad never leads with chain jargon. Handle claim, OTP, drip, and Pay are passkey-scoped. Judges should feel Cash App, not a dapp browser.

Evidence: demo video cold-start (create passkey → funded → send) under ~3 minutes; frontend https://github.com/emarc99/nonad-pay/tree/main/frontend
```

**Link:** `https://github.com/emarc99/nonad-pay/tree/main/frontend`

### Mera — One Passkey, Many Keys (not only tx signing)

**Answer**

```
From one WebAuthn PRF output we HD-derive multiple keys (bip32 m/44'/60'/0'/0/{index}): index 0 master, index 1 spend (see frontend/src/lib/mera.ts KeyRole). Spend is the viem signing session for Monad txs. The same passkey also binds non-tx credentials: +234 OTP sessions and handle restore (“Link existing”) are scoped per passkey identity so Alice and emarc99 each need their own OTP — session material is not a shared password across passkeys.

Evidence: https://github.com/emarc99/nonad-pay/blob/main/frontend/src/lib/mera.ts and Me → OTP / Link existing in the demo.
```

**Link:** `https://github.com/emarc99/nonad-pay/blob/main/frontend/src/lib/mera.ts`

---

## Suggested public links to paste

| Field | Value |
| --- | --- |
| GitHub | https://github.com/emarc99/nonad-pay |
| Product | https://nonad-pay.vercel.app |
| Demo video | TBD |
| Pitch video | TBD |
| Explorer | https://testnet.monadexplorer.com |
