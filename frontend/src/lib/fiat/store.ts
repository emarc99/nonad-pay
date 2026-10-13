import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
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

function empty(): StoreShape {
  return { otp: {}, sessions: {}, attestations: {} }
}

/** Vercel Upstash integration often injects KV_REST_API_*; CLI/docs use UPSTASH_REDIS_REST_*. */
function redisRestUrl(): string | undefined {
  return (
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim() ||
    undefined
  )
}

function redisRestToken(): string | undefined {
  return (
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim() ||
    undefined
  )
}

function upstashConfigured(): boolean {
  return Boolean(redisRestUrl() && redisRestToken())
}

/** Writable path: /tmp on Vercel (read-only bundle), .data locally. */
function storePath() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return join(tmpdir(), 'nonapay-fiat-store.json')
  }
  return join(process.cwd(), '.data', 'fiat-store.json')
}

async function upstash<T>(command: unknown[]): Promise<T | null> {
  const url = redisRestUrl()!.replace(/\/$/, '')
  const token = redisRestToken()!
  const res = await fetch(`${url}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Upstash ${res.status}: ${text.slice(0, 200)}`)
  }
  const body = (await res.json()) as { result?: T }
  return (body.result ?? null) as T | null
}

function ttlSeconds(expiresAt: number): number {
  return Math.max(1, expiresAt - Math.floor(Date.now() / 1000))
}

function loadFs(): StoreShape {
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

function persistFs(data: StoreShape) {
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

export async function putOtp(row: OtpPending) {
  if (upstashConfigured()) {
    await upstash(['SET', `nona:otp:${row.pinId}`, JSON.stringify(row), 'EX', ttlSeconds(row.expiresAt)])
    return
  }
  const data = loadFs()
  prune(data)
  data.otp[row.pinId] = row
  persistFs(data)
}

export async function getOtp(pinId: string): Promise<OtpPending | undefined> {
  if (upstashConfigured()) {
    const raw = await upstash<string | null>(['GET', `nona:otp:${pinId}`])
    if (!raw) return undefined
    return JSON.parse(raw) as OtpPending
  }
  const data = loadFs()
  prune(data)
  return data.otp[pinId]
}

export async function deleteOtp(pinId: string) {
  if (upstashConfigured()) {
    await upstash(['DEL', `nona:otp:${pinId}`])
    return
  }
  const data = loadFs()
  delete data.otp[pinId]
  persistFs(data)
}

export async function putSession(row: PhoneSession) {
  if (upstashConfigured()) {
    await upstash([
      'SET',
      `nona:session:${row.token}`,
      JSON.stringify(row),
      'EX',
      ttlSeconds(row.expiresAt),
    ])
    return
  }
  const data = loadFs()
  prune(data)
  data.sessions[row.token] = row
  persistFs(data)
}

export async function getSession(token: string): Promise<PhoneSession | undefined> {
  if (upstashConfigured()) {
    const raw = await upstash<string | null>(['GET', `nona:session:${token}`])
    if (!raw) return undefined
    return JSON.parse(raw) as PhoneSession
  }
  const data = loadFs()
  prune(data)
  const row = data.sessions[token]
  if (!row) return undefined
  if (row.expiresAt < Math.floor(Date.now() / 1000)) {
    delete data.sessions[token]
    persistFs(data)
    return undefined
  }
  return row
}

export async function putAttestation(att: FiatAttestation) {
  if (upstashConfigured()) {
    await upstash([
      'SET',
      `nona:attest:${att.paymentId.toLowerCase()}`,
      JSON.stringify(att),
      'EX',
      ttlSeconds(att.expiry),
    ])
    return
  }
  const data = loadFs()
  prune(data)
  data.attestations[att.paymentId.toLowerCase()] = att
  persistFs(data)
}

export async function getAttestation(paymentId: string): Promise<FiatAttestation | undefined> {
  const id = paymentId.toLowerCase()
  if (upstashConfigured()) {
    const raw = await upstash<string | null>(['GET', `nona:attest:${id}`])
    if (!raw) return undefined
    return JSON.parse(raw) as FiatAttestation
  }
  const data = loadFs()
  prune(data)
  return data.attestations[id]
}

export function fiatStoreBackend(): 'upstash' | 'filesystem' {
  return upstashConfigured() ? 'upstash' : 'filesystem'
}
