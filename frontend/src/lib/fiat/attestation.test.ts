import assert from 'node:assert/strict'
import { signAttestation, verifyAttestation } from './attestation'

const secret = 'test-relay-secret'
const paymentId =
  '0x277cfe12d8c60399424a0b282719105fb917258514179fcf90e8bbe9c21d31b2' as const

const att = signAttestation(secret, {
  paymentId,
  phoneHint: '+2348012345678',
  tier: 1,
  expiry: Math.floor(Date.now() / 1000) + 600,
})

assert.equal(verifyAttestation(secret, att).ok, true)
assert.equal(verifyAttestation('wrong', att).ok, false)
assert.equal(
  verifyAttestation(secret, { ...att, phoneHint: '+2348099999999' }).ok,
  false,
)
assert.equal(
  verifyAttestation(secret, { ...att, expiry: Math.floor(Date.now() / 1000) - 1 }).ok,
  false,
)

console.log('attestation.test.ts: ok')
