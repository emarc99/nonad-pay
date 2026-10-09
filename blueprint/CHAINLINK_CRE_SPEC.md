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

## Proof for judges

1. `cre workflow simulate` logs  
2. `cre workflow simulate --broadcast` tx hash on Monad Testnet  
3. Foundry ABI parity + unauthorized forwarder tests  
