const SESSION_KEY = 'nonapay.phoneSession'

export type PhoneSessionLocal = {
  sessionToken: string
  phone: string
  address: string
  expiresAt: number
}

export function loadPhoneSession(): PhoneSessionLocal | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PhoneSessionLocal
    if (parsed.expiresAt < Math.floor(Date.now() / 1000)) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function savePhoneSession(row: PhoneSessionLocal) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(row))
}

export function clearPhoneSession() {
  localStorage.removeItem(SESSION_KEY)
}

export async function requestOtp(address: string, phone: string) {
  const res = await fetch('/api/fiat/otp/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ address, phone }),
  })
  const data = (await res.json()) as {
    error?: string
    pinId?: string
    phone?: string
    mock?: boolean
    provider?: string
    demoPin?: string
    hint?: string
  }
  if (!res.ok) throw new Error(data.error ?? 'OTP request failed')
  return data as {
    pinId: string
    phone: string
    mock: boolean
    provider: string
    demoPin?: string
    hint?: string
  }
}

export async function verifyOtp(address: string, pinId: string, pin: string) {
  const res = await fetch('/api/fiat/otp/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ address, pinId, pin }),
  })
  const data = (await res.json()) as {
    error?: string
    sessionToken?: string
    phone?: string
    expiresAt?: number
  }
  if (!res.ok || !data.sessionToken || !data.phone || !data.expiresAt) {
    throw new Error(data.error ?? 'OTP verify failed')
  }
  const row = {
    sessionToken: data.sessionToken,
    phone: data.phone,
    address: address.toLowerCase(),
    expiresAt: data.expiresAt,
  }
  savePhoneSession(row)
  return row
}

export async function postAttestation(params: {
  paymentId: string
  address: string
  sessionToken: string
}) {
  const res = await fetch('/api/fiat/attest', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = (await res.json()) as { error?: string; ok?: boolean; criteria?: string }
  if (!res.ok) throw new Error(data.error ?? 'Attestation failed')
  return data
}
