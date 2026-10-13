import { createHmac } from 'node:crypto'
import { describe, expect, test } from 'bun:test'
import { encodeAbiParameters, keccak256, parseAbiParameters, toBytes } from 'viem'
import { attestationCanonical, verifyAttestation } from './attestation'

describe('NonaPay report ABI parity', () => {
	test('encodes six-field report matching NonaRegistry', () => {
		const paymentId = keccak256(toBytes('payment-1'))
		const nullifier = keccak256(toBytes('nullifier-1'))
		const recipientCommit = keccak256(toBytes('handle:amina'))
		const encoded = encodeAbiParameters(
			parseAbiParameters(
				'bytes32 paymentId, bytes32 nullifier, bytes32 recipientCommit, uint8 tier, uint64 expiry, bool approved',
			),
			[paymentId, nullifier, recipientCommit, 1, 999n, true],
		)
		expect(encoded.startsWith('0x')).toBe(true)
		expect(encoded.length).toBeGreaterThanOrEqual(2 + 64 * 6)
	})
})

describe('fiat relay attestation (fail-closed)', () => {
	const secret = 'unit-test-relay'
	const paymentId = keccak256(toBytes('pay-attestation'))
	const expiry = Math.floor(Date.now() / 1000) + 600
	const phoneHint = '+2348012345678'
	const tier = 1
	const sig = createHmac('sha256', secret)
		.update(attestationCanonical({ paymentId, phoneHint, tier, expiry }))
		.digest('hex')

	test('accepts valid HMAC', () => {
		const ok = verifyAttestation(
			secret,
			{ version: 'v1', paymentId, phoneHint, tier, expiry, sig },
			Math.floor(Date.now() / 1000),
		)
		expect(ok.ok).toBe(true)
	})

	test('rejects tampered phone', () => {
		const bad = verifyAttestation(
			secret,
			{ version: 'v1', paymentId, phoneHint: '+2348099999999', tier, expiry, sig },
			Math.floor(Date.now() / 1000),
		)
		expect(bad.ok).toBe(false)
	})

	test('rejects wrong secret', () => {
		const bad = verifyAttestation(
			'other',
			{ version: 'v1', paymentId, phoneHint, tier, expiry, sig },
			Math.floor(Date.now() / 1000),
		)
		expect(bad.ok).toBe(false)
	})
})
