import { createHash, randomInt } from 'node:crypto'
import { putOtp, getOtp, deleteOtp } from './store'
import { normalizeNgPhone, termiiMsisdn } from './phone'

const TERMII_BASE = process.env.TERMII_BASE_URL?.trim() || 'https://api.ng.termii.com/api'

export function termiiConfigured(): boolean {
  return Boolean(process.env.TERMII_API_KEY?.trim())
}

function hashPin(pin: string): string {
  return createHash('sha256').update(pin).digest('hex')
}

export async function sendOtp(params: {
  address: string
  phoneRaw: string
}): Promise<{ pinId: string; phone: string; mock: boolean; demoPin?: string }> {
  const phone = normalizeNgPhone(params.phoneRaw)
  const to = termiiMsisdn(phone)
  const address = params.address.toLowerCase()
  const ttlMin = 10
  const expiresAt = Math.floor(Date.now() / 1000) + ttlMin * 60

  const apiKey = process.env.TERMII_API_KEY?.trim()
  if (!apiKey) {
    const pin = String(randomInt(100_000, 999_999))
    const pinId = `mock-${createHash('sha256').update(`${address}:${phone}:${Date.now()}`).digest('hex').slice(0, 24)}`
    putOtp({
      pinId,
      address,
      phone,
      pinHash: hashPin(pin),
      expiresAt,
      mock: true,
    })
    return { pinId, phone, mock: true, demoPin: pin }
  }

  const from = process.env.TERMII_SENDER_ID?.trim() || 'NonaPay'
  const res = await fetch(`${TERMII_BASE}/sms/otp/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      message_type: 'NUMERIC',
      pin_type: 'NUMERIC',
      to,
      from,
      channel: 'dnd',
      pin_attempts: 3,
      pin_time_to_live: ttlMin,
      pin_length: 6,
      pin_placeholder: '< 123456 >',
      message_text: 'NonaPay code < 123456 >. Valid 10 min. Do not share.',
    }),
  })
  const body = (await res.json()) as {
    pin_id?: string
    pinId?: string
    status?: string
    message?: string
    smsStatus?: string
  }
  const pinId = body.pin_id || body.pinId
  if (!res.ok || !pinId) {
    throw new Error(body.message || body.smsStatus || 'Termii OTP send failed')
  }
  putOtp({ pinId, address, phone, expiresAt, mock: false })
  return { pinId, phone, mock: false }
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

  if (pending.mock) {
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
