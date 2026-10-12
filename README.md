# NonaPay

Cash App for cross-border AUSD on **Monad Testnet**. Mera Face ID onboarding, opaque `@handle` commits, dual-exit escrow, Chainlink CRE `writeReport` settlement.

## What's in the repo

| Path | Role |
| --- | --- |
| `contracts/` | Foundry — Gateway, P2PEscrow, PhoneResolver, NonaRegistry, MockAUSD |
| `workflow/` | CRE confidential remittance workflow (TEE + `writeReport`) |
| `frontend/` | Next.js PWA — Mera passkeys, send keypad, @handles |
| `blueprint/` | Specs, bounty must/maybe/cut matrix |

## Monad Testnet deployments

| Contract | Address |
| --- | --- |
| AUSD | `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC` |
| AUSD faucet | `0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C` |
| NonaGateway | `0x421dCd87dc70d07589CA51200bf5Ec6065C12b8c` |
| P2PEscrow | `0x6C33f144264a480B3bd414Db39127deC91A3b69D` |
| PhoneResolver | `0x3953E210A6F81BBe5d9cAA0BD2Cc89dED255f95E` |
| NonaRegistry | `0x9693aAd2540D75057D0CDce4c16891230D335A6B` |

Explorer: https://testnet.monadexplorer.com

## Quick start

```bash
# secrets (never commit)
cp .env.example .env
# fill PRIVATE_KEY (fresh testnet key) + CRE_API_KEY

# contracts
cd contracts && forge test

# frontend
cd frontend && npm install && npm run dev
# → http://localhost:43127   (use localhost — NOT 127.0.0.1; WebAuthn rejects IP RP IDs)
```

Passkeys need `http://localhost` (or HTTPS) and a PRF-capable authenticator (Google Password Manager).

**Get test funds** in the app drips `0.2 MON` + `25 AUSD` from the deployer key in repo-root `.env` (local demo only). Or use the Monad faucet for MON and Agora `requestFunds` for AUSD.

## CRE workflow

```bash
cd workflow
# secrets.yaml + .env with CRE_ETH_PRIVATE_KEY / CRE_API_KEY
cre workflow simulate remittance --target staging-settings --broadcast
```

Cron path proves TEE `writeReport` on Monad when log-trigger simulation is unavailable.

## Handle commitment

UI `@amina` → on-chain `keccak256("handle:amina")`. Same scheme as Foundry tests and CRE fixtures.

## Network policy

v1 is **Monad Testnet only**. Mainnet is out of scope until testnet e2e is green and explicitly approved.
