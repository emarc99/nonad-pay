# Metropolis Bounty Tracks — Must / Maybe / Cut

**Event:** Metropolis (Monad)  
**Primary track:** Consumer Products & Payments  
**Product:** NonaPay — zero-jargon cross-border AUSD Cash App

## Must (v1 spine)

| Target | Prize | Why load-bearing |
| --- | ---: | --- |
| Consumer Products & Payments | $10k–$30k | Primary judging track; invisible-chain remittance UX |
| Agora — Best Cross-Border Payments | $10,000 | AUSD is the settlement rail; bounty requires Mera onboarding |
| Chainlink — Best Workflow with CRE | $3,000 | TEE nullifier + `evm.writeReport` unlocks escrow (anti-AquaGhost) |
| Mera — Best Mera-Powered UX | $2,500 | Face ID / passkey replaces seed phrases |
| Mera — One Passkey, Many Keys | $2,500 | PRF / HD path split for session vs spend keys |

**Realistic combined target:** ~$23–28k if execution is deep, not checkbox-wide.

## Maybe (only after v1 is solid)

| Target | Prize | Condition |
| --- | ---: | --- |
| Envio — Best Use of Envio | $1,000 | Index `PaymentOpened` / `PaymentSettled` / `PaymentReclaimed` for the activity feed |
| Privy — beyond authentication | $5,000 | Server wallets for scheduled remittances only — not primary login |

## Cut (do not claim in v1)

| Target | Why |
| --- | --- |
| Dynamic | Same job as Mera; dilutes Agora+Mera story |
| Aurora Intents | Orthogonal multi-chain ingress; faucet AUSD is enough for demo |

## Submission narrative

NonaPay is **Programmable Money for remittances**: payer locks Agora AUSD on Monad; a Chainlink CRE confidential workflow verifies off-chain attestation material, emits a blinded nullifier, and settles via `evm.writeReport` → `NonaRegistry.onReport`. Users onboard with **Mera passkeys**. No seed phrases. Dual-exit escrow guarantees reclaim after 15 minutes if CRE is silent.

### Demo script (2–3 min)

1. Passkey signup (Face ID / Touch ID) in ~3 seconds  
2. Fund AUSD from Monad Testnet faucet  
3. Send to `@amina` (opaque on-chain commitment)  
4. CRE simulate/broadcast delivers report; recipient balance updates  
5. Show reclaim path on a second payment with no report  

### AquaGhost anti-patterns (blocked)

- [x] Load-bearing secrets in TEE (salt + +234 OTP HMAC attest verify) — not public pool ticks  
- [x] CRE is payout-on-criteria (skip write until attestation; fail-closed on forged MAC)  

- [x] Full `donRuntime.report` → `evm.writeReport` → `onReport`  
- [x] Byte-for-byte ABI parity tests  
- [x] Dual-exit escrow (release or reclaim)  
- [x] CRE is the settlement engine, not a watcher  

## Latency honesty

Monad finality for transfers is ~1s. CRE compliance is async (seconds+). Demo both: fast handle send UX, and CRE-gated remittance with reclaim safety.
