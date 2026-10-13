import { NextResponse } from 'next/server'
import { sendOtp } from '@/lib/fiat/otp'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { address?: string; phone?: string }
    if (!body.address || !/^0x[a-fA-F0-9]{40}$/.test(body.address)) {
      return NextResponse.json({ error: 'Valid passkey address required' }, { status: 400 })
    }
    if (!body.phone) {
      return NextResponse.json({ error: 'Phone required' }, { status: 400 })
    }
    const result = await sendOtp({ address: body.address, phoneRaw: body.phone })
    return NextResponse.json({
      pinId: result.pinId,
      phone: result.phone,
      mock: result.mock,
      provider: result.provider,
      ...(result.demoPin ? { demoPin: result.demoPin } : {}),
      hint: result.hint,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'OTP request failed'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
