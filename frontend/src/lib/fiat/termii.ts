/** Termii helpers — send/verify live in otp.ts */

export function termiiConfigured(): boolean {
  return Boolean(process.env.TERMII_API_KEY?.trim())
}
