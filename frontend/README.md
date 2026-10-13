# NonaPay frontend

Next.js PWA for Mera passkey onboarding and Cash App–style AUSD sends on Monad Testnet.

```bash
npm install
npm run dev
# http://localhost:43127  — must be localhost (not 127.0.0.1) for WebAuthn
```

Repo-root `.env` `PRIVATE_KEY` powers the local `/api/drip` helper (MON + AUSD for new passkey wallets).

**Fiat criteria:** verify `+234` on Me (Termii or mock OTP), then Send posts `/api/fiat/attest` so CRE can release escrow.