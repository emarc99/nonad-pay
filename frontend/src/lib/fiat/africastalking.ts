/**
 * Africa's Talking Sandbox SMS OTP.
 * Messages appear in https://simulator.africastalking.com:1517/ — not on a real handset.
 * Docs: https://help.africastalking.com/en/articles/1170660-how-do-i-get-started-on-the-africa-s-talking-sandbox
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
  const from = process.env.AFRICASTALKING_FROM?.trim() // optional shortcode

  const body = new URLSearchParams()
  body.set('username', username)
  body.set('to', params.toE164)
  body.set('message', params.message)
  if (from) body.set('from', from)

  const res = await fetch(SANDBOX_SMS, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      apiKey,
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
    /* AT sometimes returns XML if Accept ignored */
  }

  const recipient = parsed.SMSMessageData?.Recipients?.[0]
  const ok =
    res.ok &&
    recipient &&
    (recipient.statusCode === 101 ||
      recipient.statusCode === 100 ||
      /success|sent/i.test(recipient.status || ''))

  if (!ok) {
    const hint =
      parsed.SMSMessageData?.Message ||
      recipient?.status ||
      text.slice(0, 240) ||
      `HTTP ${res.status}`
    throw new Error(
      `Africa's Talking sandbox SMS failed: ${hint}. Open the simulator and register ${params.toE164}.`,
    )
  }

  return { messageId: recipient?.messageId }
}
