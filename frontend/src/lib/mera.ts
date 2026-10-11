'use client'

import {
  createPasskeyWithPrfOutput,
  createSecp256k1SigningSession,
  getPasskeyPrfOutput,
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

export async function createAccount() {
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
}

export async function signIn(role: KeyRole = 'spend') {
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
