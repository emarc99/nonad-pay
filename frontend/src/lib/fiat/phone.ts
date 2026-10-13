/** Nigeria MSISDN helpers (+234). */

const NG_CC = '234'

export function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '')
}

/**
 * Normalize user input to E.164 (+234…) or throw.
 * Accepts: +234801…, 234801…, 0801…, 801… (10-subscriber).
 */
export function normalizeNgPhone(raw: string): string {
  let d = digitsOnly(raw)
  if (!d) throw new Error('Enter a Nigerian phone number (+234…)')

  if (d.startsWith('0') && d.length === 11) d = NG_CC + d.slice(1)
  else if (d.length === 10 && /^[789]/.test(d)) d = NG_CC + d
  else if (d.startsWith(NG_CC) && d.length >= 13) d = d.slice(0, 13)
  else if (!(d.startsWith(NG_CC) && d.length === 13)) {
    throw new Error('Use a valid Nigerian number, e.g. +2348012345678')
  }

  if (!d.startsWith(NG_CC) || d.length !== 13) {
    throw new Error('Use a valid Nigerian number, e.g. +2348012345678')
  }
  return `+${d}`
}

/** Termii `to` field: 2348012345678 (no plus). */
export function termiiMsisdn(e164: string): string {
  return digitsOnly(normalizeNgPhone(e164))
}

/** Opaque PhoneResolver handle from a verified MSISDN (no +). */
export function phoneAsHandle(e164: string): string {
  return termiiMsisdn(e164)
}

export function isNgPhoneInput(raw: string): boolean {
  const t = raw.trim()
  if (!t) return false
  if (t.includes('@') && !/^@?\+?234/.test(t) && !/^@?0[789]/.test(t)) return false
  try {
    normalizeNgPhone(t.replace(/^@/, ''))
    return true
  } catch {
    return false
  }
}

export function displayPhoneOrHandle(raw: string): string {
  const stripped = raw.trim().replace(/^@/, '')
  if (isNgPhoneInput(stripped)) {
    try {
      return normalizeNgPhone(stripped)
    } catch {
      /* fall through */
    }
  }
  const name = stripped.toLowerCase().replace(/[^a-z0-9._+-]/g, '')
  return name ? `@${name}` : ''
}
