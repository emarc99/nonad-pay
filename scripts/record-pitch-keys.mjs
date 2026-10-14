/** Record live pitch by advancing with ArrowRight (works without Vercel autoplay deploy). */
import { chromium } from 'playwright'
import { mkdir, rename } from 'node:fs/promises'
import path from 'node:path'

const OUT = '/opt/cursor/artifacts/videos'
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] })
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
})
const page = await context.newPage()
await page.goto('https://nonad-pay.vercel.app/pitch', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(2000)
for (let i = 0; i < 5; i++) {
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(5500)
}
await page.waitForTimeout(4000)
const vid = page.video()
await context.close()
const src = await vid.path()
const dest = path.join(OUT, 'live-pitch.webm')
await rename(src, dest)
await browser.close()

// mp4
import { spawnSync } from 'node:child_process'
spawnSync(
  'ffmpeg',
  ['-y', '-i', dest, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', path.join(OUT, 'live-pitch.mp4')],
  { stdio: 'inherit' },
)
console.log('wrote live-pitch.mp4')
