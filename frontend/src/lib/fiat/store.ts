import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { FiatAttestation } from './attestation'

type OtpPending = {
  pinId: string
  address: string
  phone: string
  /** sha256 hex of pin when we generate it (mock / Africa's Talking) */
  pinHash?: string
  expiresAt: number
  mock: boolean
  provider?: 'mock' | 'termii' | 'africastalking'
}

type PhoneSession = {
  token: string
  address: string
  phone: string
  expiresAt: number
}

type StoreShape = {
  otp: Record<string, OtpPending>
  sessions: Record<string, PhoneSession>
  attestations: Record<string, FiatAttestation>
}

const g = globalThis as unknown as { __nonapayFiatStore?: StoreShape }

function storePath() {
  return resolve(process.cwd(), '.data/fiat-store.json')
}

function empty(): StoreShape {
  return { otp: {}, sessions: {}, attestations: {} }
}

function load(): StoreShape {
  if (g.__nonapayFiatStore) return g.__nonapayFiatStore
  const path = storePath()
  try {
    if (existsSync(path)) {
      g.__nonapayFiatStore = JSON.parse(readFileSync(path, 'utf8')) as StoreShape
      return g.__nonapayFiatStore
    }
  } catch {
    /* corrupt → reset */
  }
  g.__nonapayFiatStore = empty()
  return g.__nonapayFiatStore
}

function persist(data: StoreShape) {
  g.__nonapayFiatStore = data
  const path = storePath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2))
}

function prune(data: StoreShape, now = Math.floor(Date.now() / 1000)) {
  for (const [k, v] of Object.entries(data.otp)) {
    if (v.expiresAt < now) delete data.otp[k]
  }
  for (const [k, v] of Object.entries(data.sessions)) {
    if (v.expiresAt < now) delete data.sessions[k]
  }
  for (const [k, v] of Object.entries(data.attestations)) {
    if (v.expiry < now) delete data.attestations[k]
  }
}

export function putOtp(row: OtpPending) {
  const data = load()
  prune(data)
  data.otp[row.pinId] = row
  persist(data)
}

export function getOtp(pinId: string): OtpPending | undefined {
  const data = load()
  prune(data)
  return data.otp[pinId]
}

export function deleteOtp(pinId: string) {
  const data = load()
  delete data.otp[pinId]
  persist(data)
}

export function putSession(row: PhoneSession) {
  const data = load()
  prune(data)
  data.sessions[row.token] = row
  persist(data)
}

export function getSession(token: string): PhoneSession | undefined {
  const data = load()
  prune(data)
  const row = data.sessions[token]
  if (!row) return undefined
  if (row.expiresAt < Math.floor(Date.now() / 1000)) {
    delete data.sessions[token]
    persist(data)
    return undefined
  }
  return row
}

export function putAttestation(att: FiatAttestation) {
  const data = load()
  prune(data)
  data.attestations[att.paymentId.toLowerCase()] = att
  persist(data)
}

export function getAttestation(paymentId: string): FiatAttestation | undefined {
  const data = load()
  prune(data)
  return data.attestations[paymentId.toLowerCase()]
}
