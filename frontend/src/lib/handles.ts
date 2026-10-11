import { keccak256, toBytes, type Hex } from 'viem'

/** Normalize UI handle → opaque on-chain commitment. Matches contract tests: keccak256("handle:amina"). */
export function normalizeHandle(raw: string): string {
  let h = raw.trim().toLowerCase()
  if (h.startsWith('@')) h = h.slice(1)
  if (h.startsWith('handle:')) h = h.slice('handle:'.length)
  return h.replace(/[^a-z0-9._+-]/g, '')
}

export function handleCommit(raw: string): Hex {
  const name = normalizeHandle(raw)
  if (!name) throw new Error('Enter a handle')
  return keccak256(toBytes(`handle:${name}`))
}

export function displayHandle(raw: string): string {
  const name = normalizeHandle(raw)
  return name ? `@${name}` : ''
}
