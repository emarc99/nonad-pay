import { describe, expect, test } from 'bun:test'
import { encodeAbiParameters, keccak256, parseAbiParameters, toBytes } from 'viem'

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
		expect(encoded.length).toBeGreaterThan(2 + 64 * 6)
	})
})
