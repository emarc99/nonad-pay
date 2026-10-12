import type { Address, Hex } from 'viem'
import { PHONE_RESOLVER } from './addresses'
import { resolverAbi } from './abi'
import { publicClient } from './chain'
import { displayHandle, handleCommit, normalizeHandle } from './handles'

const STORAGE_KEY = 'nonapay.myHandle'
const ZERO = '0x0000000000000000000000000000000000000000' as const

export type HandleOwnership = 'available' | 'mine' | 'taken'

export function loadStoredMyHandle(): string {
  if (typeof localStorage === 'undefined') return ''
  return normalizeHandle(localStorage.getItem(STORAGE_KEY) ?? '')
}

export function saveMyHandle(raw: string): string {
  const normalized = normalizeHandle(raw)
  if (!normalized) throw new Error('Enter a handle')
  localStorage.setItem(STORAGE_KEY, normalized)
  return normalized
}

export function clearStoredMyHandle() {
  localStorage.removeItem(STORAGE_KEY)
}

export async function getHandleOwnership(raw: string, me: Address) {
  const normalized = normalizeHandle(raw)
  if (normalized.length < 2) throw new Error('Enter a handle (at least 2 characters)')
  const commit = handleCommit(normalized)
  const owner = await publicClient.readContract({
    address: PHONE_RESOLVER,
    abi: resolverAbi,
    functionName: 'ownerOf',
    args: [commit],
  })
  let status: HandleOwnership = 'available'
  if (owner !== ZERO) {
    status = owner.toLowerCase() === me.toLowerCase() ? 'mine' : 'taken'
  }
  return { status, commit, owner: owner as Address, normalized }
}

/** Link an already-registered handle owned by this address into local profile storage. */
export async function linkMyHandle(raw: string, me: Address) {
  const { status, commit, owner, normalized } = await getHandleOwnership(raw, me)
  if (status === 'available') {
    throw new Error(
      `${displayHandle(normalized)} is not registered yet. Use Register to claim it.`,
    )
  }
  if (status === 'taken') {
    throw new Error(
      `${displayHandle(normalized)} belongs to ${owner.slice(0, 6)}…${owner.slice(-4)}, not this passkey.`,
    )
  }
  saveMyHandle(normalized)
  return { commit, normalized } as { commit: Hex; normalized: string }
}

/**
 * Re-check localStorage against chain after sign-in.
 * Clears stale handles that another wallet claimed in this browser profile.
 */
export async function syncStoredMyHandle(me: Address): Promise<string> {
  const stored = loadStoredMyHandle()
  if (!stored) return ''
  const { status } = await getHandleOwnership(stored, me)
  if (status !== 'mine') {
    clearStoredMyHandle()
    return ''
  }
  return stored
}
