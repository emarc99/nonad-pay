import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { verifyOtp } from '@/lib/fiat/termii'
import { putSession } from '@/lib/fiat/store'

const SESSION_TTL_SEC = 30 * 60

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { address?: string; pinId?: string; pin?: string }
    if (!body.address || !body.pinId || !body.pin) {
      return NextResponse.json({ error: 'address, pinId, and pin required' }, { status: 400 })
    }
    const { phone } = await verifyOtp({
      address: body.address,
      pinId: body.pinId,
      pin: body.pin,
    })
    const token = randomBytes(24).toString('base64url')
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC
    putSession({
      token,
      address: body.address.toLowerCase(),
      phone,
      expiresAt,
    })
    return NextResponse.json({
      ok: true,
      phone,
      sessionToken: token,
      expiresAt,
      next: 'After openPayment, POST /api/fiat/attest with paymentId + sessionToken (webhook-gated criteria).',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'OTP verify failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
