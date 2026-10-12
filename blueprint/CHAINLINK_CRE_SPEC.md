# Chainlink CRE Spec (v1) — Anti-AquaGhost

## Goal

CRE is the **settlement engine**. Escrow unlocks only via DON/`writeReport` (or reclaim timeout).

## Lessons from ETHOnline winners vs AquaGhost

| Rule | Do |
| --- | --- |
| Load-bearing TEE | Process phone plaintext / mock fiat HMAC / salt — not public AMM ticks |
| Delivery | `donRuntime.report` **and** `evmClient.writeReport` |
| ABI parity | Encode matches `NonaRegistry` decode byte-for-byte |
| Silent safe | Optional: no on-chain spam when nothing to settle |
| Dual-exit | Reclaim after 15m if CRE silent |

## Secrets (Vault DON)

- `ENCLAVE_NULLIFIER_SALT`
- `FIAT_RELAY_AUTH_TOKEN` (HMAC for mock mobile-money attestation)
- Optional AML API key

## Nullifier

```
nullifier = keccak256(abi.encodePacked(phoneOrHandle, gateway, salt))
```

## Monad Testnet forwarders

- Simulate+broadcast: `0xB9F79d863261869B234c481D1f9A7af84AeAd192`
- Deployed workflow: `0xF8344CFd5c43616a4366C34E3EEE75af79a74482`

## Settlement triggers (live)

1. **EVM log trigger** on `PaymentOpened` — settles that payment immediately when the DON delivers the log  
2. **Cron + `filterLogs`** — every N seconds scans the last `lookbackBlocks` for `PaymentOpened`, skips `processedPayments`, settles up to `maxSettlementsPerTick`  
3. **Optional `demoPaymentId`** — local `simulate --broadcast` override only; not required for live pays  

Staging registry: `private` (no mainnet gas).

## Proof for judges

1. `cre workflow simulate` logs  
2. `cre workflow simulate --broadcast` tx hash on Monad Testnet  
3. Foundry ABI parity + unauthorized forwarder tests  
4. Private-registry workflow `nonapay-remittance-staging` active + execution list  
