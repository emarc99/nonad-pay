# NonaPay — Master Blueprint (v1)

Zero-PII cross-border Cash App on Monad. Settles Agora AUSD. Unlocks via Chainlink CRE. Onboards with Mera passkeys.

## Problem

Remittance corridors lose 6–12% and take days. Crypto rails exist but demand seed phrases, gas math, and public addresses that doxx recipients.

## Solution

1. Mera Face ID onboarding — no seed phrase  
2. Send to `@handle` / phone UI — opaque `recipientCommit` on-chain  
3. Lock AUSD in dual-exit escrow  
4. CRE TEE derives nullifier + attestation; `evm.writeReport` releases funds  
5. If silent for 15 minutes → `reclaimFunds`

## Architecture

```
Payer (Mera) → NonaGateway → P2PEscrow
                    │              ▲
                    │ PaymentOpened│ release
                    ▼              │
              CRE TEE ──writeReport──► NonaRegistry
```

## Repo

- `contracts/` — Foundry (Gateway, Escrow, Registry, Resolver)  
- `workflow/` — CRE confidential workflow  
- `frontend/` — Next.js PWA + Mera  
- `blueprint/` — specs and bounty matrix  

## Network policy

v1 ships on **Monad Testnet only**. Mainnet is out of scope until testnet e2e is green and explicitly approved.
