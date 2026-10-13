import { NextResponse } from 'next/server'

/**
 * Termii delivery / status webhook sink.
 * OTP truth for settlement is still verify-token → session → attest (PayPal-style:
 * event arrives → we act). DLR here is observability + optional future gates.
 */
export async function POST(req: Request) {
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    payload = { raw: await req.text() }
  }
  console.info('[termii-webhook]', JSON.stringify(payload).slice(0, 2000))
  return NextResponse.json({ received: true })
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    role: 'Termii webhook receiver',
    settlementPath: 'OTP verify callback → POST /api/fiat/attest → CRE GET + HMAC verify',
  })
}
