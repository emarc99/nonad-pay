# NonaPay

Cash App for cross-border AUSD on **Monad Testnet**. Mera passkey onboarding, `@handle` / `+234` sends, dual-exit escrow, Chainlink CRE as **criteria engine** (`+234` OTP → HMAC relay → `writeReport`).

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

## Fiat criteria (+234 OTP)

1. **Me** → enter `+234…` → Send OTP (Termii, or mock `demoPin` if `TERMII_API_KEY` unset) → Verify  
2. **Send** → pay `@alice` or `+234…` → app posts signed attestation for `paymentId`  
3. CRE fetches attestation over HTTPS and releases only if HMAC verifies  

Set the same `FIAT_RELAY_AUTH_TOKEN` in repo `.env` and CRE vault. Point CRE `fiatRelayUrl` at a **public** `https://…/api/fiat/attest` (not localhost), then redeploy the workflow. Details: [`blueprint/FIAT_CRITERIA.md`](blueprint/FIAT_CRITERIA.md).

**Live app:** [https://nonad-pay.vercel.app](https://nonad-pay.vercel.app) — on Vercel, add **Upstash Redis** (`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) so OTP/attestations survive across serverless instances for CRE.

## CRE workflow

Staging uses the **private** (Chainlink-hosted) registry — no Ethereum mainnet ETH / `LinkOwner`.

```bash
cd workflow
# CRE_API_KEY in workflow/.env (cre login / API key)
# Set fiatRelayUrl in remittance/config.staging.json to your public attest URL
cre workflow deploy remittance --target staging-settings --yes --non-interactive

# Local settle proof (uses MockKeystone — temporarily setForwarder to Mock if registry is on Keystone):
cre workflow simulate remittance --target staging-settings --broadcast --non-interactive --trigger-index 0
```

Live deploy: `nonapay-remittance-staging` on private registry. `NonaRegistry` forwarder is Keystone (`0xF834…`) for DON writes; MockKeystone (`0xB9F79…`) is only for local `simulate --broadcast`.

## Handle commitment

UI `@amina` → `keccak256("handle:amina")`. Phone `+2348012345678` → `keccak256("handle:2348012345678")`.

## Network policy

v1 is **Monad Testnet only**. Mainnet is out of scope until testnet e2e is green and explicitly approved.
