/**
 * Record live pitch autoplay + app home via Playwright (Chromium).
 * Output: /opt/cursor/artifacts/videos/live-*.webm
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

const OUT = '/opt/cursor/artifacts/videos'
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({
  headless: true,
  args: ['--disable-dev-shm-usage'],
})

async function recordPage(name, url, seconds) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
  })
  const page = await context.newPage()
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await page.waitForTimeout(seconds * 1000)
  const vid = page.video()
  await context.close()
  const src = await vid.path()
  const dest = path.join(OUT, `${name}.webm`)
  const { rename } = await import('node:fs/promises')
  await rename(src, dest)
  console.log('wrote', dest)
}

await recordPage('live-app-home', 'https://nonad-pay.vercel.app/', 8)
// 6 slides * 5.5s + buffer
await recordPage('live-pitch', 'https://nonad-pay.vercel.app/pitch?autoplay=1&ms=5500', 40)

await browser.close()
console.log('done')
