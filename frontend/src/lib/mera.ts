'use client'

import {
  createPasskeyWithPrfOutput,
  createSecp256k1SigningSession,
  getPasskeyPrfOutput,
  isMeraError,
  type Secp256k1SigningSession,
} from '@category-labs/mera'
import { toViemAccount } from '@category-labs/mera/viem'
import { HDKey } from '@scure/bip32'
import { entropyToMnemonic, mnemonicToSeedSync } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { createWalletClient, http, type Hex, type WalletClient } from 'viem'
import { monadTestnet } from 'viem/chains'

const CRED_KEY = 'nonapay.credential'

function deriveEvmKey(prfOutput: Uint8Array, index = 0): Uint8Array {
  const seed = mnemonicToSeedSync(entropyToMnemonic(prfOutput, wordlist))
  const node = HDKey.fromMasterSeed(seed).derive(`m/44'/60'/0'/0/${index}`)
  if (node.privateKey === null) throw new Error('derivation produced no key')
  return node.privateKey
}

/** Master key index 0; spend/session key index 1 — One Passkey, Many Keys. */
export type KeyRole = 'master' | 'spend'

let session: Secp256k1SigningSession | undefined

function indexFor(role: KeyRole) {
  return role === 'spend' ? 1 : 0
}

/** WebAuthn RP IDs must be domains — IP literals like 127.0.0.1 are rejected. */
export function passkeyHostOk(): boolean {
  if (typeof window === 'undefined') return true
  const host = location.hostname
  if (host === 'localhost') return true
  // Reject raw IPv4 / IPv6
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false
  if (host.includes(':')) return false
  return Boolean(host)
}

export function localhostUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:43127'
  return `${location.protocol}//localhost${location.port ? `:${location.port}` : ''}${location.pathname}${location.search}`
}

function assertPasskeyOrigin() {
  if (typeof window === 'undefined') return
  if (!window.isSecureContext) {
    throw new Error('Passkeys need a secure context (https or http://localhost).')
  }
  if (!window.PublicKeyCredential) {
    throw new Error('This browser has no WebAuthn / passkey support.')
  }
  if (!passkeyHostOk()) {
    throw new Error(
      `Invalid passkey domain “${location.hostname}”. Open ${localhostUrl()} instead of 127.0.0.1 — WebAuthn rejects IP addresses.`,
    )
  }
}

function formatPasskeyError(error: unknown): Error {
  if (isMeraError(error)) {
    const cause =
      error.cause instanceof Error
        ? error.cause.message
        : error.cause
          ? String(error.cause)
          : undefined

    if (error.code === 'PRF_UNAVAILABLE') {
      return new Error(
        'Authenticator returned no WebAuthn PRF. In Chrome, choose Google Password Manager when creating the passkey (not “this device” / local profile).',
      )
    }

    if (cause?.toLowerCase().includes('invalid domain')) {
      return new Error(
        `Invalid passkey domain “${location.hostname}”. Use ${localhostUrl()} — WebAuthn requires a hostname, not an IP.`,
      )
    }

    if (error.code === 'PASSKEY_OPERATION_FAILED') {
      return new Error(`Passkey failed: ${cause || error.message}`)
    }

    return new Error(`${error.message}${cause ? ` — ${cause}` : ''}`)
  }

  if (error instanceof Error) return error
  return new Error(String(error))
}

export async function createAccount() {
  assertPasskeyOrigin()
  try {
    const created = await createPasskeyWithPrfOutput({
      rp: { id: location.hostname, name: 'NonaPay' },
      user: { name: `user@${location.hostname}`, displayName: 'NonaPay' },
    })
    localStorage.setItem(
      CRED_KEY,
      JSON.stringify({ credentialId: created.credentialId, transports: created.transports }),
    )
    session?.end()
    session = createSecp256k1SigningSession({
      privateKey: deriveEvmKey(created.prfOutput, indexFor('spend')),
    })
    return toViemAccount(session).address
  } catch (error) {
    throw formatPasskeyError(error)
  }
}

export async function signIn(role: KeyRole = 'spend') {
  assertPasskeyOrigin()
  try {
    const stored = localStorage.getItem(CRED_KEY)
    const known = stored ? JSON.parse(stored) : undefined
    const { prfOutput, credentialId } = await getPasskeyPrfOutput({
      rpId: location.hostname,
      credential: known,
    })
    localStorage.setItem(
      CRED_KEY,
      JSON.stringify(known?.credentialId === credentialId ? known : { credentialId }),
    )
    session?.end()
    session = createSecp256k1SigningSession({
      privateKey: deriveEvmKey(prfOutput, indexFor(role)),
    })
    return toViemAccount(session).address
  } catch (error) {
    throw formatPasskeyError(error)
  }
}

export function getWalletClient(): WalletClient {
  if (!session) throw new Error('Not signed in')
  return createWalletClient({
    account: toViemAccount(session),
    chain: monadTestnet,
    transport: http('https://testnet-rpc.monad.xyz'),
  })
}

export function getAddress(): Hex | undefined {
  if (!session) return undefined
  return toViemAccount(session).address
}

export function signOut() {
  session?.end()
  session = undefined
}
