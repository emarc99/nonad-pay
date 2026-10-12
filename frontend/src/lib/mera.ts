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
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'
import { monadTestnet } from 'viem/chains'

const CRED_KEY = 'nonapay.credential'
const DEMO_KEY = 'nonapay.demo.pk'

function deriveEvmKey(prfOutput: Uint8Array, index = 0): Uint8Array {
  const seed = mnemonicToSeedSync(entropyToMnemonic(prfOutput, wordlist))
  const node = HDKey.fromMasterSeed(seed).derive(`m/44'/60'/0'/0/${index}`)
  if (node.privateKey === null) throw new Error('derivation produced no key')
  return node.privateKey
}

/** Master key index 0; spend/session key index 1 — One Passkey, Many Keys. */
export type KeyRole = 'master' | 'spend'

let session: Secp256k1SigningSession | undefined
let demoAccount: ReturnType<typeof privateKeyToAccount> | undefined

function indexFor(role: KeyRole) {
  return role === 'spend' ? 1 : 0
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
        'This authenticator has no WebAuthn PRF. On desktop Chrome, save the passkey to Google Password Manager (or use 1Password / iCloud Keychain) — local fingerprint alone often fails. See mera.category.xyz/authenticator-support',
      )
    }

    if (error.code === 'PASSKEY_OPERATION_FAILED') {
      const hint = cause?.includes('NotAllowedError')
        ? 'Cancelled or blocked by the browser.'
        : cause?.includes('InvalidStateError')
          ? 'Passkey already exists for this site.'
          : cause || error.message
      return new Error(`Passkey failed (${error.code}): ${hint}`)
    }

    return new Error(`Passkey failed (${error.code}): ${error.message}${cause ? ` — ${cause}` : ''}`)
  }

  if (error instanceof Error) return error
  return new Error(String(error))
}

function assertSecureContext() {
  if (typeof window === 'undefined') return
  if (!window.isSecureContext) {
    throw new Error('Passkeys need a secure context (https or localhost).')
  }
  if (!window.PublicKeyCredential) {
    throw new Error('This browser has no WebAuthn / passkey support.')
  }
}

export async function createAccount() {
  assertSecureContext()
  try {
    const created = await createPasskeyWithPrfOutput({
      rp: { id: location.hostname, name: 'NonaPay' },
      user: { name: `user@${location.hostname}`, displayName: 'NonaPay' },
    })
    localStorage.setItem(
      CRED_KEY,
      JSON.stringify({ credentialId: created.credentialId, transports: created.transports }),
    )
    localStorage.removeItem(DEMO_KEY)
    demoAccount = undefined
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
  assertSecureContext()
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
    localStorage.removeItem(DEMO_KEY)
    demoAccount = undefined
    session?.end()
    session = createSecp256k1SigningSession({
      privateKey: deriveEvmKey(prfOutput, indexFor(role)),
    })
    return toViemAccount(session).address
  } catch (error) {
    throw formatPasskeyError(error)
  }
}

/** Local-only wallet when the device/browser cannot do WebAuthn PRF. Not Mera-backed. */
export function createDemoAccount() {
  const pk = generatePrivateKey()
  localStorage.setItem(DEMO_KEY, pk)
  localStorage.removeItem(CRED_KEY)
  session?.end()
  session = undefined
  demoAccount = privateKeyToAccount(pk)
  return demoAccount.address
}

export function restoreDemoAccount(): Hex | undefined {
  const pk = localStorage.getItem(DEMO_KEY) as Hex | null
  if (!pk) return undefined
  demoAccount = privateKeyToAccount(pk)
  return demoAccount.address
}

export function isDemoSession() {
  return Boolean(demoAccount) || Boolean(localStorage.getItem(DEMO_KEY))
}

export function getWalletClient(): WalletClient {
  if (demoAccount) {
    return createWalletClient({
      account: demoAccount,
      chain: monadTestnet,
      transport: http('https://testnet-rpc.monad.xyz'),
    })
  }
  if (!session) throw new Error('Not signed in')
  return createWalletClient({
    account: toViemAccount(session),
    chain: monadTestnet,
    transport: http('https://testnet-rpc.monad.xyz'),
  })
}

export function getAddress(): Hex | undefined {
  if (demoAccount) return demoAccount.address
  if (!session) return undefined
  return toViemAccount(session).address
}

export function signOut() {
  session?.end()
  session = undefined
  demoAccount = undefined
}
