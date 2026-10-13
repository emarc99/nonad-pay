/**
 * Fiat relay attestation (canonical string must match frontend/src/lib/fiat/attestation.ts).
 * CRE fetches JSON from fiatRelayUrl and verifies HMAC-SHA256 before approving.
 */
import { hmac } from '@noble/hashes/hmac'
import { sha256 } from '@noble/hashes/sha256'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils'

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

function hmacSha256Hex(secret: string, message: string): string {
	return bytesToHex(hmac(sha256, utf8ToBytes(secret), utf8ToBytes(message)))
}

/** Constant-time hex compare (equal length only). */
function safeEqualHex(a: string, b: string): boolean {
	const x = a.toLowerCase()
	const y = b.toLowerCase()
	if (x.length !== y.length) return false
	let out = 0
	for (let i = 0; i < x.length; i++) out |= x.charCodeAt(i) ^ y.charCodeAt(i)
	return out === 0
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

	const expected = hmacSha256Hex(
		secret,
		attestationCanonical({
			paymentId: att.paymentId,
			phoneHint: att.phoneHint,
			tier: att.tier,
			expiry: att.expiry,
		}),
	)

	if (!safeEqualHex(expected, att.sig)) {
		return { ok: false, reason: 'bad signature' }
	}
	return { ok: true, phoneHint: att.phoneHint, tier: att.tier, expiry: att.expiry }
}
