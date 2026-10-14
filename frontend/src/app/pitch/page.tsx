'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

type Slide = {
  id: string
  kicker: string
  title: string
  body: string
  points?: string[]
  footer?: string
}

const SLIDES: Slide[] = [
  {
    id: 'who',
    kicker: 'Metropolis · Consumer Payments',
    title: 'NonaPay',
    body: 'Cash App for AUSD remittances on Monad. Passkeys in. @handles out. Escrow that only unlocks when criteria are real.',
    footer: 'Live · nonad-pay.vercel.app',
  },
  {
    id: 'problem',
    kicker: 'The problem',
    title: 'Remittance UX is still homework.',
    body: 'Seed phrases, 0x addresses, and “compliance” that is just a public watcher. Recipients should not need MetaMask to receive dollars.',
    points: [
      'Cross-border senders want Cash App simplicity',
      'Fake watchers unlock escrow without load-bearing proof',
      'Frozen funds with no reclaim path destroy trust',
    ],
  },
  {
    id: 'solution',
    kicker: 'The solution',
    title: 'Invisible chain. Programmable release.',
    body: 'Mera passkey → send AUSD to @alice or +234 → dual-exit escrow. Chainlink CRE verifies +234 OTP attestation in a TEE, then writeReport releases — or the payer reclaims in 15 minutes.',
    points: [
      'Cash App keypad UX — no seed phrases',
      'CRE is the criteria engine, not a spectator',
      '15m reclaim if settlement stays silent',
    ],
  },
  {
    id: 'flow',
    kicker: 'How it works',
    title: 'Pay → Attest → Settle',
    body: 'One path from passkey to release. Every step is either on Monad Testnet or inside CRE’s confidential workflow.',
    points: [
      '1 · openPayment locks Agora AUSD in P2PEscrow',
      '2 · +234 OTP → HMAC attest on the public relay',
      '3 · CRE GET + Vault secrets → writeReport → release',
    ],
  },
  {
    id: 'why',
    kicker: 'Why this stack',
    title: 'Monad · Agora · Mera · Chainlink',
    body: 'Each piece carries weight — not logos for logos’ sake.',
    points: [
      'Monad — fast finality for the send UX',
      'Agora AUSD — dollar-stable settlement rail',
      'Mera — one passkey, PRF-derived keys, Face ID in',
      'CRE — TEE HMAC criteria + DON writeReport',
    ],
  },
  {
    id: 'ask',
    kicker: 'Try it',
    title: 'Send dollars to an @handle.',
    body: 'Open the live app, create a passkey, verify +234, drip test funds, pay @alice. Watch CRE release — or reclaim if criteria never land.',
    footer: 'https://nonad-pay.vercel.app',
  },
]

export default function PitchPage() {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)

  const goTo = useCallback((i: number) => {
    const el = scrollerRef.current
    if (!el) return
    const next = Math.max(0, Math.min(SLIDES.length - 1, i))
    const child = el.children[next] as HTMLElement | undefined
    child?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
    setIndex(next)
  }, [])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const onScroll = () => {
      const w = el.clientWidth || 1
      const i = Math.round(el.scrollLeft / w)
      setIndex(Math.max(0, Math.min(SLIDES.length - 1, i)))
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault()
        goTo(index + 1)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        goTo(index - 1)
      } else if (e.key === 'Home') {
        e.preventDefault()
        goTo(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        goTo(SLIDES.length - 1)
      }
    }

    el.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('scroll', onScroll)
      window.removeEventListener('keydown', onKey)
    }
  }, [goTo, index])

  useEffect(() => {
    let cool = false
    const onWheel = (e: WheelEvent) => {
      const el = scrollerRef.current
      if (!el || cool) return
      const dominant = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX
      if (Math.abs(dominant) < 20) return
      e.preventDefault()
      cool = true
      goTo(index + (dominant > 0 ? 1 : -1))
      window.setTimeout(() => {
        cool = false
      }, 550)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [goTo, index])

  // ?autoplay=1 — timed advance for screen-recorded pitch clips
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('autoplay') !== '1') return
    const ms = Number(params.get('ms') || '8000')
    const id = window.setInterval(() => {
      setIndex((current) => {
        const next = current + 1
        if (next >= SLIDES.length) {
          window.clearInterval(id)
          return current
        }
        const el = scrollerRef.current
        const child = el?.children[next] as HTMLElement | undefined
        child?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
        return next
      })
    }, Number.isFinite(ms) && ms > 1000 ? ms : 8000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="pitch-root relative h-[100dvh] w-full overflow-hidden text-[var(--foam)]">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4 sm:px-8">
        <p className="font-[family-name:var(--font-display)] text-sm font-bold tracking-[0.2em] text-[var(--mint)]">
          NONAPAY
        </p>
        <div className="pointer-events-auto flex items-center gap-3 text-xs text-[var(--mist)]">
          <span className="hidden sm:inline">
            {index + 1} / {SLIDES.length}
          </span>
          <Link href="/" className="rounded-full border border-[var(--mist)]/30 px-3 py-1.5 text-[var(--foam)] transition hover:border-[var(--mint)] hover:text-[var(--mint)]">
            App
          </Link>
        </div>
      </header>

      <div
        ref={scrollerRef}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {SLIDES.map((slide, i) => (
          <section
            key={slide.id}
            className="pitch-slide relative flex h-[100dvh] w-full shrink-0 snap-start snap-always flex-col justify-center px-6 py-20 sm:px-16 lg:px-24"
            aria-label={`Slide ${i + 1}: ${slide.title}`}
          >
            <div
              className={`pitch-panel max-w-3xl ${i === index ? 'pitch-panel-active' : ''}`}
            >
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--mint)]">
                {slide.kicker}
              </p>
              <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
                {slide.title}
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--mist)] sm:text-lg">
                {slide.body}
              </p>
              {slide.points ? (
                <ul className="mt-8 space-y-3 border-l border-[var(--mint)]/40 pl-5 text-sm text-[var(--foam)] sm:text-base">
                  {slide.points.map((p) => (
                    <li key={p} className="leading-snug">
                      {p}
                    </li>
                  ))}
                </ul>
              ) : null}
              {slide.footer ? (
                slide.id === 'ask' ? (
                  <a
                    href="https://nonad-pay.vercel.app"
                    className="mt-10 inline-flex items-center gap-2 rounded-full bg-[var(--mint)] px-5 py-3 text-sm font-bold text-[var(--ink)] transition hover:bg-[var(--foam)]"
                  >
                    Open live app
                    <span aria-hidden>→</span>
                  </a>
                ) : (
                  <p className="mono mt-10 text-xs text-[var(--mist)]">{slide.footer}</p>
                )
              ) : null}
            </div>
            <div
              className="pointer-events-none absolute -right-10 bottom-10 hidden h-48 w-48 rounded-full opacity-30 blur-3xl sm:block"
              style={{ background: 'radial-gradient(circle, var(--mint), transparent 70%)' }}
              aria-hidden
            />
          </section>
        ))}
      </div>

      <nav
        className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2"
        aria-label="Slides"
      >
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index}
            onClick={() => goTo(i)}
            className={`h-2 rounded-full transition-all ${
              i === index ? 'w-8 bg-[var(--mint)]' : 'w-2 bg-[var(--mist)]/40 hover:bg-[var(--mist)]'
            }`}
          />
        ))}
      </nav>

      <p className="pointer-events-none absolute bottom-6 right-5 z-10 hidden text-[10px] uppercase tracking-[0.16em] text-[var(--mist)]/70 sm:block">
        ← → or scroll
      </p>
    </div>
  )
}
