/**
 * Fiat relay attestation (must match frontend/src/lib/fiat/attestation.ts byte-for-byte).
 * CRE fetches JSON from fiatRelayUrl and verifies HMAC-SHA256 before approving.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

export const ATTESTATION_VERSION = 'v1' as const

export type FiatAttestation = {
	version: string
	paymentId: string
	phoneHint: string
	tier: number
	expiry: number
	sig: string
}

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

export function verifyAttestation(
	secret: string,
	att: FiatAttestation,
	nowSec: number,
): { ok: true; phoneHint: string; tier: number; expiry: number } | { ok: false; reason: string } {
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
	return { ok: true, phoneHint: att.phoneHint, tier: att.tier, expiry: att.expiry }
}
