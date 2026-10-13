import { createHash, randomInt } from 'node:crypto'
import { sendSandboxSms, africastalkingConfigured } from './africastalking'
import { normalizeNgPhone, termiiMsisdn } from './phone'
import { deleteOtp, getOtp, putOtp } from './store'
import { termiiConfigured } from './termii'

const TERMII_BASE = process.env.TERMII_BASE_URL?.trim() || 'https://api.ng.termii.com/api'

export type OtpProvider = 'mock' | 'termii' | 'africastalking'

function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex')
}

/** Prefer AT sandbox → Termii → mock (no KYC testing path first). */
export function resolveOtpProvider(): OtpProvider {
  const forced = process.env.OTP_PROVIDER?.trim().toLowerCase()
  if (forced === 'mock' || forced === 'termii' || forced === 'africastalking') {
    if (forced === 'africastalking' && !africastalkingConfigured()) {
      throw new Error('OTP_PROVIDER=africastalking but AFRICASTALKING_API_KEY is unset')
    }
    if (forced === 'termii' && !termiiConfigured()) {
      throw new Error('OTP_PROVIDER=termii but TERMII_API_KEY is unset')
    }
    return forced
  }
  if (africastalkingConfigured()) return 'africastalking'
  if (termiiConfigured()) return 'termii'
  return 'mock'
}

async function sendTermiiOtp(params: {
  to: string
  address: string
  phone: string
  expiresAt: number
}): Promise<{ pinId: string }> {
  const apiKey = process.env.TERMII_API_KEY?.trim()
  if (!apiKey) throw new Error('TERMII_API_KEY missing')
  const from = process.env.TERMII_SENDER_ID?.trim() || 'NonaPay'
  const res = await fetch(`${TERMII_BASE}/sms/otp/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      message_type: 'NUMERIC',
      pin_type: 'NUMERIC',
      to: params.to,
      from,
      channel: 'dnd',
      pin_attempts: 3,
      pin_time_to_live: 10,
      pin_length: 6,
      pin_placeholder: '< 123456 >',
      message_text: 'NonaPay code < 123456 >. Valid 10 min. Do not share.',
    }),
  })
  const body = (await res.json()) as {
    pin_id?: string
    pinId?: string
    message?: string
    smsStatus?: string
  }
  const pinId = body.pin_id || body.pinId
  if (!res.ok || !pinId) {
    throw new Error(body.message || body.smsStatus || 'Termii OTP send failed')
  }
  putOtp({
    pinId,
    address: params.address,
    phone: params.phone,
    expiresAt: params.expiresAt,
    mock: false,
    provider: 'termii',
  })
  return { pinId }
}

export async function sendOtp(params: {
  address: string
  phoneRaw: string
}): Promise<{
  pinId: string
  phone: string
  mock: boolean
  provider: OtpProvider
  demoPin?: string
  hint: string
}> {
  const phone = normalizeNgPhone(params.phoneRaw)
  const toDigits = termiiMsisdn(phone)
  const address = params.address.toLowerCase()
  const expiresAt = Math.floor(Date.now() / 1000) + 10 * 60
  const provider = resolveOtpProvider()

  if (provider === 'termii') {
    const { pinId } = await sendTermiiOtp({
      to: toDigits,
      address,
      phone,
      expiresAt,
    })
    return {
      pinId,
      phone,
      mock: false,
      provider,
      hint: 'SMS sent via Termii. Enter the code from your phone.',
    }
  }

  // mock + africastalking: we generate the PIN (AT has no Token API in sandbox)
  const pin = String(randomInt(100_000, 999_999))
  const pinId = `${provider}-${createHash('sha256')
    .update(`${address}:${phone}:${Date.now()}`)
    .digest('hex')
    .slice(0, 24)}`

  if (provider === 'africastalking') {
    await sendSandboxSms({
      toE164: phone,
      message: `Your NonaPay verification code is ${pin}. Valid 10 minutes. Do not share.`,
    })
    putOtp({
      pinId,
      address,
      phone,
      pinHash: hashPin(pin),
      expiresAt,
      mock: false,
      provider: 'africastalking',
    })
    return {
      pinId,
      phone,
      mock: false,
      provider,
      hint: `Sandbox SMS queued. Open AT simulator, register ${phone}, read the code from inbox (not your handset).`,
    }
  }

  putOtp({
    pinId,
    address,
    phone,
    pinHash: hashPin(pin),
    expiresAt,
    mock: true,
    provider: 'mock',
  })
  return {
    pinId,
    phone,
    mock: true,
    provider: 'mock',
    demoPin: pin,
    hint: 'No SMS provider configured — mock OTP (demoPin). Set AFRICASTALKING_API_KEY for sandbox SMS.',
  }
}

export async function verifyOtp(params: {
  pinId: string
  pin: string
  address: string
}): Promise<{ phone: string }> {
  const pending = getOtp(params.pinId)
  if (!pending) throw new Error('OTP expired or unknown. Request a new code.')
  if (pending.address !== params.address.toLowerCase()) {
    throw new Error('OTP was requested for a different passkey session.')
  }
  if (pending.expiresAt < Math.floor(Date.now() / 1000)) {
    deleteOtp(params.pinId)
    throw new Error('OTP expired. Request a new code.')
  }

  const pin = params.pin.trim()
  if (!/^\d{4,8}$/.test(pin)) throw new Error('Enter the SMS code')

  const provider = pending.provider || (pending.mock ? 'mock' : 'termii')

  if (provider === 'mock' || provider === 'africastalking') {
    if (!pending.pinHash || hashPin(pin) !== pending.pinHash) {
      throw new Error('Incorrect code')
    }
    deleteOtp(params.pinId)
    return { phone: pending.phone }
  }

  const apiKey = process.env.TERMII_API_KEY?.trim()
  if (!apiKey) throw new Error('TERMII_API_KEY missing')

  const res = await fetch(`${TERMII_BASE}/sms/otp/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, pin_id: params.pinId, pin }),
  })
  const body = (await res.json()) as {
    verified?: string | boolean
    message?: string
  }
  const ok = body.verified === true || body.verified === 'True' || body.verified === 'true'
  if (!res.ok || !ok) {
    throw new Error(body.message || 'OTP verification failed')
  }
  deleteOtp(params.pinId)
  return { phone: pending.phone }
}
