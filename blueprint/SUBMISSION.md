# NonaPay — Metropolis submission notes

## Track

Consumer — programmable remittance Cash App (Agora AUSD + CRE confidential settlement + Mera).

## One-liner

Send AUSD to an `@handle` with Face ID; Chainlink CRE unlocks dual-exit escrow on Monad.

## Proof points

1. **Contracts live on Monad Testnet** — Gateway / Escrow / Resolver / Registry (see root README).
2. **openPayment** → escrow lock with opaque `recipientCommit`.
3. **CRE TEE** `writeReport` → Registry `onReport` → `releaseFunds`.
4. **Mera PWA** — passkey PRF → HD spend key → approve + openPayment.
5. **Reclaim path** — 15 minute grace so funds cannot freeze forever.

## Bounty stack (v1)

| Partner | Use |
| --- | --- |
| Agora | AUSD settlement + faucet |
| Chainlink CRE | Confidential workflow + writeReport |
| Mera | Passkey auth / key derivation |
| Monad | Testnet execution + gasLimit discipline |

Cut from v1: Dynamic, Aurora, Envio, Privy (post-v1).

## Demo script

1. Open PWA → Create with Face ID  
2. Get test funds  
3. Claim `@yourname`  
4. Send $5 to a registered handle  
5. Run CRE simulate `--broadcast` (or show settled tx)  
6. Show explorer links for open + release  
