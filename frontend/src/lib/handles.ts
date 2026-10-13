import { keccak256, toBytes, type Hex } from 'viem'
import { displayPhoneOrHandle, isNgPhoneInput, phoneAsHandle } from './fiat/phone'

/** Normalize UI handle → opaque on-chain commitment. Matches contract tests: keccak256("handle:amina"). */
export function normalizeHandle(raw: string): string {
  let h = raw.trim().toLowerCase()
  if (h.startsWith('@')) h = h.slice(1)
  if (h.startsWith('handle:')) h = h.slice('handle:'.length)
  // Nigerian MSISDN → digits-only handle (234801…) so phone-number send works
  if (isNgPhoneInput(h) || isNgPhoneInput(raw.trim())) {
    try {
      return phoneAsHandle(raw.trim().replace(/^@/, ''))
    } catch {
      /* fall through */
    }
  }
  return h.replace(/[^a-z0-9._+-]/g, '')
}

export function handleCommit(raw: string): Hex {
  const name = normalizeHandle(raw)
  if (!name) throw new Error('Enter a handle or +234 phone')
  return keccak256(toBytes(`handle:${name}`))
}

export function displayHandle(raw: string): string {
  const shown = displayPhoneOrHandle(raw)
  if (shown) return shown
  const name = normalizeHandle(raw)
  return name ? `@${name}` : ''
}
