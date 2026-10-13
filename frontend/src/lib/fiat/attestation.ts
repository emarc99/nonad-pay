import { createHmac, timingSafeEqual } from 'node:crypto'

export const ATTESTATION_VERSION = 'v1' as const

export type FiatAttestation = {
  version: typeof ATTESTATION_VERSION
  paymentId: `0x${string}`
  phoneHint: string
  tier: number
  expiry: number
  sig: string
}

/** Canonical bytes CRE and the relay must agree on. */
export function attestationCanonical(parts: {
  paymentId: string
  phoneHint: string
  tier: number
  expiry: number
}): string {
  return [
    ATTESTATION_VERSION,
    parts.paymentId.toLowerCase(),
    parts.phoneHint,
    String(parts.tier),
    String(parts.expiry),
  ].join('|')
}

export function signAttestation(
  secret: string,
  parts: { paymentId: `0x${string}`; phoneHint: string; tier: number; expiry: number },
): FiatAttestation {
  const canonical = attestationCanonical(parts)
  const sig = createHmac('sha256', secret).update(canonical).digest('hex')
  return {
    version: ATTESTATION_VERSION,
    paymentId: parts.paymentId,
    phoneHint: parts.phoneHint,
    tier: parts.tier,
    expiry: parts.expiry,
    sig,
  }
}

export function verifyAttestation(
  secret: string,
  att: FiatAttestation,
  nowSec = Math.floor(Date.now() / 1000),
): { ok: true } | { ok: false; reason: string } {
  if (att.version !== ATTESTATION_VERSION) return { ok: false, reason: 'bad version' }
  if (!/^0x[a-fA-F0-9]{64}$/.test(att.paymentId)) return { ok: false, reason: 'bad paymentId' }
  if (!att.phoneHint?.startsWith('+234')) return { ok: false, reason: 'bad phoneHint' }
  if (!Number.isFinite(att.tier) || att.tier < 1) return { ok: false, reason: 'bad tier' }
  if (!Number.isFinite(att.expiry) || att.expiry <= nowSec) return { ok: false, reason: 'expired' }
  if (!/^[a-f0-9]{64}$/i.test(att.sig)) return { ok: false, reason: 'bad sig format' }

  const expected = createHmac('sha256', secret)
    .update(
      attestationCanonical({
        paymentId: att.paymentId,
        phoneHint: att.phoneHint,
        tier: att.tier,
        expiry: att.expiry,
      }),
    )
    .digest('hex')

  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(att.sig, 'hex')
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad signature' }
  }
  return { ok: true }
}

export function relaySecret(): string {
  const s = process.env.FIAT_RELAY_AUTH_TOKEN?.trim()
  if (s) return s
  // Local/demo only — CRE vault should override in live DON
  return 'nonapay-demo-fiat-relay'
}
