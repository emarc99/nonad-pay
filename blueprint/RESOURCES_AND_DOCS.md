# Resources & Docs (v1)

## Networks

| Item | Value |
| --- | --- |
| Monad Testnet chain ID | `10143` |
| RPC | `https://testnet-rpc.monad.xyz` |
| Explorer | https://testnet.monadexplorer.com |
| Native gas | MON |

## Settlement asset (Agora)

| Item | Address |
| --- | --- |
| AUSD (Monad Testnet) | `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC` |
| AUSD faucet | `0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C` |
| Decimals | 6 |
| Docs | https://docs.agora.finance |

## Chainlink CRE

| Item | Value |
| --- | --- |
| Staging registry | `private` (Chainlink-hosted — no mainnet gas / LinkOwner) |
| Live workflow | `nonapay-remittance-staging` |
| MockKeystone (local `simulate --broadcast` only) | `0xB9F79d863261869B234c481D1f9A7af84AeAd192` |
| Keystone (live DON writeReport) | `0xF8344CFd5c43616a4366C34E3EEE75af79a74482` |
| CRE docs | https://docs.chain.link/cre |
| Private registry deploy | https://docs.chain.link/cre/guides/operations/deploying-to-private-registry-ts |
| Confidential workflows | https://docs.chain.link/cre/guides/workflow/using-confidential-workflows |

## Mera

| Item | Link |
| --- | --- |
| Monad Mera guide | https://docs.monad.xyz/guides/mera |
| Package | `@category-labs/mera` |

## Metropolis resources used in v1

- Consumer idea: [Programmable Money](https://chain.link/article/programmable-money-mechanics) (escrow + criteria release)
- UX idea: payments as social gestures (Cash App keypad / handles)
- Monad gas: https://docs.monad.xyz/developer-essentials/gas-pricing (explicit `gasLimit`)
- Deploy / verify: https://docs.monad.xyz/guides/deploy-smart-contract/

## Claim for the team (infra)

- Tenderly Pro (Metropolis voucher) — tx simulation  
- Quicknode Build — stable RPC  
- Optional: Crouton free RPC, Zerion Builder  

## Explicitly not used in v1

Dynamic, Aurora Intents, Circle SCA wallets as primary auth, Superfluid/Sablier ISA products, mainnet deploy.
