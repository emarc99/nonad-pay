# Smart Contract Spec (v1)

**Network:** Monad Testnet (10143)  
**Solidity:** 0.8.26  
**Token:** Agora AUSD (6 decimals, EIP-2612)

## Contracts

### NonaGateway

- `openPayment(token, amount, recipientCommit, maxRiskScore)`
- `openPaymentWithPermit(...)` — gasless allowance via EIP-2612
- Emits `PaymentOpened` for CRE log trigger
- On-chain commit is opaque — not a raw phone number

### P2PEscrow

- `lockFunds` (gateway only)
- `releaseFunds` (registry only)
- `reclaimFunds` after `gracePeriod` (default 15 minutes)
- Invariant: funds cannot be frozen forever

### NonaRegistry

- Implements `IReceiver.onReport(metadata, report)`
- Forwarder-gated (`MockKeystone` for simulate; Keystone for deployed workflows)
- Report ABI: `(bytes32 paymentId, bytes32 nullifier, bytes32 recipientCommit, uint8 tier, uint64 expiry, bool approved)`
- Resolves recipient via `PhoneResolver` then releases escrow

### PhoneResolver

- `registerHandle(handleHash, recipient)` / `updateHandle`
- No plaintext phones on-chain

## Test matrix

- Happy path remittance settlement  
- Reclaim after timeout  
- Unauthorized report reverts  
- Permit gasless deposit  
- ABI parity round-trip  
- Nullifier double-spend reverts  
- Rejected report does not release  
