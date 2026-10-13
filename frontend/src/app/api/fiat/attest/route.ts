import { NextResponse } from 'next/server'
import { relaySecret, signAttestation, verifyAttestation, type FiatAttestation } from '@/lib/fiat/attestation'
import { getAttestation, getSession, putAttestation } from '@/lib/fiat/store'

const ATTEST_TTL_SEC = 20 * 60

function authorizedFetch(req: Request): boolean {
  const secret = relaySecret()
  const auth = req.headers.get('authorization') || ''
  const header = req.headers.get('x-nona-relay-token') || ''
  if (header && header === secret) return true
  if (auth.startsWith('Bearer ') && auth.slice(7) === secret) return true
  return false
}

/** CRE (or operators) fetch signed attestation — fail-closed if missing. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const paymentId = (url.searchParams.get('paymentId') || '').toLowerCase()
  if (!/^0x[a-f0-9]{64}$/.test(paymentId)) {
    return NextResponse.json({ error: 'paymentId required' }, { status: 400 })
  }
  if (!authorizedFetch(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const att = getAttestation(paymentId)
  if (!att) {
    return NextResponse.json({ error: 'No attestation for paymentId' }, { status: 404 })
  }
  const check = verifyAttestation(relaySecret(), att)
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 410 })
  }
  return NextResponse.json(att, {
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json',
    },
  })
}

/**
 * Issue attestation only after OTP session (webhook/callback truth).
 * Binds verified +234 phone to paymentId for CRE criteria check.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      paymentId?: string
      sessionToken?: string
      address?: string
      tier?: number
    }
    const paymentId = (body.paymentId || '').toLowerCase()
    if (!/^0x[a-f0-9]{64}$/.test(paymentId)) {
      return NextResponse.json({ error: 'Valid paymentId required' }, { status: 400 })
    }
    if (!body.sessionToken || !body.address) {
      return NextResponse.json({ error: 'sessionToken and address required' }, { status: 400 })
    }
    const session = getSession(body.sessionToken)
    if (!session) {
      return NextResponse.json(
        { error: 'Phone session missing or expired. Complete +234 OTP first.' },
        { status: 403 },
      )
    }
    if (session.address !== body.address.toLowerCase()) {
      return NextResponse.json({ error: 'Session belongs to another passkey' }, { status: 403 })
    }

    const expiry = Math.floor(Date.now() / 1000) + ATTEST_TTL_SEC
    const tier = body.tier && body.tier >= 1 ? Math.min(body.tier, 3) : 1
    const att: FiatAttestation = signAttestation(relaySecret(), {
      paymentId: paymentId as `0x${string}`,
      phoneHint: session.phone,
      tier,
      expiry,
    })
    putAttestation(att)
    return NextResponse.json({
      ok: true,
      attestation: att,
      criteria: 'CRE will release escrow only if HMAC verifies for this paymentId before expiry.',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Attest failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
