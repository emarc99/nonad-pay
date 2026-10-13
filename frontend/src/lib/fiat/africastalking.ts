/**
 * Africa's Talking Sandbox SMS OTP.
 * Auth: username `sandbox` + sandbox API key header `apikey`
 * (see https://developers.africastalking.com/docs/authentication
 *  and https://developers.africastalking.com/docs/sms/overview).
 * Messages appear in https://simulator.africastalking.com:1517/ — not on a real handset.
 */

const SANDBOX_SMS = 'https://api.sandbox.africastalking.com/version1/messaging'

export function africastalkingConfigured(): boolean {
  return Boolean(process.env.AFRICASTALKING_API_KEY?.trim())
}

export async function sendSandboxSms(params: {
  toE164: string
  message: string
}): Promise<{ messageId?: string }> {
  const apiKey = process.env.AFRICASTALKING_API_KEY?.trim()
  if (!apiKey) throw new Error('AFRICASTALKING_API_KEY missing')

  const username = process.env.AFRICASTALKING_USERNAME?.trim() || 'sandbox'
  const from = process.env.AFRICASTALKING_FROM?.trim() // only if you have a sandbox shortcode

  const body = new URLSearchParams()
  body.set('username', username)
  body.set('to', params.toE164)
  body.set('message', params.message)
  if (from) body.set('from', from)

  const res = await fetch(SANDBOX_SMS, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      // Official SDK / docs use lowercase `apikey` (form body, not JSON).
      apikey: apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const text = await res.text()
  let parsed: {
    SMSMessageData?: {
      Message?: string
      Recipients?: Array<{ statusCode?: number; status?: string; messageId?: string }>
    }
  } = {}
  try {
    parsed = JSON.parse(text) as typeof parsed
  } catch {
    /* AT may return XML if Accept is wrong */
  }

  const recipient = parsed.SMSMessageData?.Recipients?.[0]
  const summary = parsed.SMSMessageData?.Message || ''
  // Success is HTTP 201 + recipient statusCode 101 (Queued/Success).
  const ok =
    (res.ok || res.status === 201) &&
    Boolean(recipient) &&
    (recipient!.statusCode === 101 ||
      recipient!.statusCode === 100 ||
      /success/i.test(recipient!.status || ''))

  if (!ok) {
    const hint = summary || recipient?.status || text.slice(0, 240) || `HTTP ${res.status}`
    if (res.status === 401 || /authentication is invalid/i.test(hint)) {
      throw new Error(
        `Africa's Talking auth invalid (401). Confirm key from Sandbox → Settings → API Key, username=sandbox. New keys can take up to ~20 minutes.`,
      )
    }
    throw new Error(
      `Africa's Talking sandbox SMS failed: ${hint}. Open the simulator and register ${params.toE164}.`,
    )
  }

  return { messageId: recipient?.messageId }
}
