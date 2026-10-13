'use client'

import { useEffect, useState, useTransition } from 'react'
import type { Hex } from 'viem'
import { createAccount, localhostUrl, passkeyHostOk, signIn, signOut } from '@/lib/mera'
import { getAusdBalance, getMonBalance } from '@/lib/chain'
import { displayHandle, handleCommit, normalizeHandle } from '@/lib/handles'
import { registerHandle, requestAusdFaucet, sendToHandle } from '@/lib/payments'
import { loadActivity, pushActivity, type ActivityItem } from '@/lib/activity'
import { linkMyHandle, loadStoredMyHandle, saveMyHandle, syncStoredMyHandle } from '@/lib/myHandle'
import {
  loadPhoneSession,
  postAttestation,
  requestOtp,
  verifyOtp,
  type PhoneSessionLocal,
} from '@/lib/fiat/client'

type Tab = 'send' | 'me' | 'activity'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'] as const

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function explorerTx(hash: string) {
  return `https://testnet.monadexplorer.com/tx/${hash}`
}

function StatusLine({
  status,
  className = '',
}: {
  status: { tone: 'ok' | 'err' | 'info'; text: string; hash?: string }
  className?: string
}) {
  const tone =
    status.tone === 'err' ? 'status-err' : status.tone === 'ok' ? 'status-ok' : 'text-[var(--mist)]'
  if (status.hash) {
    return (
      <p className={`${tone} ${className}`}>
        {status.text}
        {' · '}
        <a
          className="mono underline-offset-2 hover:underline"
          href={explorerTx(status.hash)}
          target="_blank"
          rel="noreferrer"
        >
          {shorten(status.hash)}
        </a>
      </p>
    )
  }
  return <p className={`${tone} ${className}`}>{status.text}</p>
}

export default function Home() {
  const [address, setAddress] = useState<Hex | undefined>()
  const [ausd, setAusd] = useState('0')
  const [mon, setMon] = useState('0')
  const [amount, setAmount] = useState('0')
  const [handle, setHandle] = useState('')
  const [myHandle, setMyHandle] = useState('')
  const [tab, setTab] = useState<Tab>('send')
  const [status, setStatus] = useState<{
    tone: 'ok' | 'err' | 'info'
    text: string
    hash?: string
  } | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [amountKey, setAmountKey] = useState(0)
  const [pending, startTransition] = useTransition()
  const [hostOk, setHostOk] = useState(true)
  const [localUrl, setLocalUrl] = useState('http://localhost:43127')
  const [phoneInput, setPhoneInput] = useState('')
  const [otpPin, setOtpPin] = useState('')
  const [otpPinId, setOtpPinId] = useState('')
  const [phoneSession, setPhoneSession] = useState<PhoneSessionLocal | null>(null)
  const [demoPin, setDemoPin] = useState<string | undefined>()

  async function refreshBalances(addr: Hex) {
    const [a, m] = await Promise.all([getAusdBalance(addr), getMonBalance(addr)])
    setAusd(Number(a.formatted).toLocaleString(undefined, { maximumFractionDigits: 2 }))
    setMon(Number(m.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 }))
  }

  useEffect(() => {
    setActivity(loadActivity())
    const saved = loadStoredMyHandle()
    if (saved) setMyHandle(saved)
    const session = loadPhoneSession()
    if (session) {
      setPhoneSession(session)
      setPhoneInput(session.phone)
    }
    setHostOk(passkeyHostOk())
    setLocalUrl(localhostUrl())
  }, [])

  useEffect(() => {
    if (!address) return
    void refreshBalances(address).catch(() => undefined)
    void syncStoredMyHandle(address)
      .then((linked) => setMyHandle(linked))
      .catch(() => undefined)
    const session = loadPhoneSession()
    if (session && session.address === address.toLowerCase()) setPhoneSession(session)
    else setPhoneSession(null)
    const id = setInterval(() => {
      void refreshBalances(address).catch(() => undefined)
    }, 12_000)
    return () => clearInterval(id)
  }, [address])

  function onKey(key: (typeof KEYS)[number]) {
    setAmountKey((k) => k + 1)
    setAmount((prev) => {
      if (key === '⌫') {
        if (prev.length <= 1) return '0'
        return prev.slice(0, -1)
      }
      if (key === '.') {
        if (prev.includes('.')) return prev
        return `${prev}.`
      }
      if (prev === '0') return key
      const next = `${prev}${key}`
      const [, frac = ''] = next.split('.')
      if (frac.length > 2) return prev
      if (Number(next) > 100_000) return prev
      return next
    })
  }

  function run(label: string, fn: () => Promise<void>) {
    setStatus({ tone: 'info', text: label })
    startTransition(() => {
      void (async () => {
        try {
          await fn()
        } catch (e) {
          const text = e instanceof Error ? e.message : 'Something went wrong'
          setStatus({ tone: 'err', text })
        }
      })()
    })
  }

  function onCreate() {
    run('Creating passkey…', async () => {
      const addr = await createAccount()
      setAddress(addr)
      const linked = await syncStoredMyHandle(addr)
      if (linked) setMyHandle(linked)
      setStatus({
        tone: 'ok',
        text: linked
          ? `Passkey ready · ${shorten(addr)} · linked ${displayHandle(linked)}`
          : `Passkey account ready · ${shorten(addr)}`,
      })
    })
  }

  function onSignIn() {
    run('Confirm passkey…', async () => {
      const addr = await signIn('spend')
      setAddress(addr)
      const linked = await syncStoredMyHandle(addr)
      if (linked) setMyHandle(linked)
      setStatus({
        tone: 'ok',
        text: linked
          ? `Signed in · ${shorten(addr)} · linked ${displayHandle(linked)}`
          : `Signed in · ${shorten(addr)}. Link your @ on My @ if this device is new.`,
      })
    })
  }

  function onSignOut() {
    signOut()
    setAddress(undefined)
    setAusd('0')
    setMon('0')
    setStatus(null)
  }

  function onSend() {
    if (!address) return
    run('Approving + opening payment…', async () => {
      const session = phoneSession ?? loadPhoneSession()
      if (!session || session.address !== address.toLowerCase()) {
        throw new Error('Verify your +234 phone on My @ first — CRE releases only after OTP attestation.')
      }
      const { hash, commit, paymentId } = await sendToHandle(handle, amount)
      let list = pushActivity({
        kind: 'send',
        title: `Sent $${amount} to ${displayHandle(handle)}`,
        detail: `commit ${commit.slice(0, 10)}… · escrow locked until CRE criteria`,
        hash,
      })
      if (!paymentId) {
        setActivity(list)
        setStatus({
          tone: 'err',
          text: 'Payment opened but paymentId missing from logs — attest manually failed',
          hash,
        })
        setAmount('0')
        await refreshBalances(address)
        return
      }
      await postAttestation({
        paymentId,
        address,
        sessionToken: session.sessionToken,
      })
      list = pushActivity({
        kind: 'attest',
        title: `Attested ${session.phone}`,
        detail: `payment ${paymentId.slice(0, 10)}… · CRE may release`,
        hash,
      })
      setActivity(list)
      setStatus({
        tone: 'ok',
        text: 'Payment opened + phone attestation posted (CRE criteria)',
        hash,
      })
      setAmount('0')
      await refreshBalances(address)
    })
  }

  function onRequestOtp() {
    if (!address) return
    run('Sending +234 OTP…', async () => {
      const data = await requestOtp(address, phoneInput)
      setOtpPinId(data.pinId)
      setDemoPin(data.demoPin)
      if (data.demoPin) setOtpPin(data.demoPin)
      setPhoneInput(data.phone)
      const list = pushActivity({
        kind: 'otp',
        title: data.mock ? `Mock OTP → ${data.phone}` : `OTP sent → ${data.phone}`,
        detail: data.mock ? `demo code ${data.demoPin}` : 'Enter the SMS code',
      })
      setActivity(list)
      setStatus({
        tone: 'ok',
        text:
          data.hint ||
          (data.mock
            ? `Mock OTP ready (${data.demoPin})`
            : `Code sent to ${data.phone} via ${data.provider}`),
      })
    })
  }

  function onVerifyOtp() {
    if (!address || !otpPinId) return
    run('Verifying OTP…', async () => {
      const session = await verifyOtp(address, otpPinId, otpPin)
      setPhoneSession(session)
      setOtpPin('')
      setDemoPin(undefined)
      const list = pushActivity({
        kind: 'otp',
        title: `Verified ${session.phone}`,
        detail: 'Session ready — send will post attestation for CRE',
      })
      setActivity(list)
      setStatus({ tone: 'ok', text: `${session.phone} verified · criteria unlocked for sends` })
    })
  }

  function onRegisterHandle() {
    if (!address) return
    run('Registering @handle…', async () => {
      const { hash, commit } = await registerHandle(myHandle, address)
      const normalized = saveMyHandle(myHandle)
      setMyHandle(normalized)
      const list = pushActivity({
        kind: 'handle',
        title: `Claimed ${displayHandle(normalized)}`,
        detail: `commit ${commit.slice(0, 10)}…`,
        hash,
      })
      setActivity(list)
      setStatus({ tone: 'ok', text: `${displayHandle(normalized)} registered`, hash })
    })
  }

  function onLinkHandle() {
    if (!address) return
    run('Verifying @handle on-chain…', async () => {
      const { commit, normalized } = await linkMyHandle(myHandle, address)
      setMyHandle(normalized)
      const list = pushActivity({
        kind: 'handle',
        title: `Linked ${displayHandle(normalized)}`,
        detail: `commit ${commit.slice(0, 10)}… · already owned on-chain`,
      })
      setActivity(list)
      setStatus({ tone: 'ok', text: `${displayHandle(normalized)} linked to this passkey` })
    })
  }

  function onFaucet() {
    if (!address) return
    run('Requesting Agora AUSD…', async () => {
      const hash = await requestAusdFaucet(address)
      const list = pushActivity({
        kind: 'faucet',
        title: 'Claimed AUSD faucet',
        detail: 'Up to 10,000 AUSD if under cap',
        hash,
      })
      setActivity(list)
      setStatus({ tone: 'ok', text: 'Faucet tx', hash })
      await refreshBalances(address)
    })
  }

  function onDrip() {
    if (!address) return
    run('Dripping test MON + AUSD…', async () => {
      const res = await fetch('/api/drip', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ address }),
      })
      const data = (await res.json()) as {
        error?: string
        monHash?: string
        ausdHash?: string
        mon?: string
        ausd?: string
      }
      if (!res.ok) throw new Error(data.error ?? 'Drip failed')
      pushActivity({
        kind: 'drip',
        title: `Drip ${data.mon} MON`,
        detail: 'Local deployer drip',
        hash: data.monHash,
      })
      if (data.ausdHash) {
        pushActivity({
          kind: 'drip',
          title: `Drip ${data.ausd} AUSD`,
          detail: 'Local deployer drip',
          hash: data.ausdHash,
        })
      }
      setActivity(loadActivity())
      setStatus({ tone: 'ok', text: 'Test funds', hash: data.monHash })
      await refreshBalances(address)
    })
  }

  const canSend =
    Boolean(address) && Number(amount) > 0 && normalizeHandle(handle).length >= 2 && !pending

  return (
    <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col px-4 pb-10 pt-6 sm:max-w-lg sm:px-6">
      <header className="anim-rise mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="chip mb-3">Monad Testnet · Agora AUSD · CRE</p>
          <h1 className="brand-word text-5xl font-extrabold leading-none sm:text-6xl">NonaPay</h1>
          <p className="mt-3 max-w-[18rem] text-sm leading-relaxed text-[var(--mist)]">
            Passkey in. Send dollars to an @handle. CRE unlocks the escrow.
          </p>
        </div>
        {address ? (
          <button type="button" className="ghost-btn text-xs" onClick={onSignOut}>
            Sign out
          </button>
        ) : null}
      </header>

      {!hostOk ? (
        <section className="panel anim-rise-delay flex flex-1 flex-col justify-center gap-5 p-6">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
              Open on localhost
            </h2>
            <p className="mt-2 text-sm text-[var(--mist)]">
              WebAuthn rejects IP addresses like <span className="mono">127.0.0.1</span>. Passkeys only
              work on a real hostname — use <span className="mono">localhost</span>.
            </p>
          </div>
          <a className="primary-btn btn-pulse w-full text-center text-base no-underline" href={localUrl}>
            Continue on localhost
          </a>
        </section>
      ) : !address ? (
        <section className="panel anim-rise-delay flex flex-1 flex-col justify-center gap-5 p-6">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
              One passkey. Real AUSD.
            </h2>
            <p className="mt-2 text-sm text-[var(--mist)]">
              Mera derives your spend key from a Google Password Manager passkey (PRF). When Chrome asks
              where to save it, pick Google Password Manager — not “this device”.
            </p>
          </div>
          <button type="button" className="primary-btn btn-pulse w-full text-base" disabled={pending} onClick={onCreate}>
            Create passkey
          </button>
          <button type="button" className="ghost-btn w-full" disabled={pending} onClick={onSignIn}>
            I already have a passkey
          </button>
          {status ? <StatusLine status={status} className="text-sm leading-relaxed" /> : null}
        </section>
      ) : (
        <>
          <section className="panel anim-rise-delay mb-4 p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--mist)]">Balance</p>
                <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight">
                  ${ausd}
                  <span className="ml-2 text-base font-semibold text-[var(--mint)]">AUSD</span>
                </p>
              </div>
              <div className="text-right text-xs text-[var(--mist)]">
                <p className="mono">{shorten(address)}</p>
                <p className="mt-1">{mon} MON gas</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="ghost-btn text-xs" disabled={pending} onClick={onDrip}>
                Get test funds
              </button>
              <button type="button" className="ghost-btn text-xs" disabled={pending} onClick={onFaucet}>
                Agora faucet
              </button>
            </div>
          </section>

          <nav className="mb-4 grid grid-cols-3 gap-1 rounded-full border border-white/10 bg-black/20 p-1 text-sm font-semibold">
            {([
              ['send', 'Send'],
              ['me', 'Me'],
              ['activity', 'Activity'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-full px-3 py-2 transition ${
                  tab === id ? 'bg-[var(--mint)] text-[var(--ink)]' : 'text-[var(--mist)]'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {tab === 'send' ? (
            <section className="panel flex flex-1 flex-col p-5">
              <div className="mb-2 text-center">
                <p
                  key={amountKey}
                  className="anim-amount font-[family-name:var(--font-display)] text-6xl font-extrabold tracking-tight"
                >
                  <span className="text-[var(--mist)]">$</span>
                  {amount}
                </p>
                <p className="mt-1 text-xs text-[var(--mist)]">
                  Escrow locks until CRE criteria (+234 OTP attestation) · 15m reclaim
                </p>
                {phoneSession ? (
                  <p className="mt-1 text-xs text-[var(--mint)]">Payer phone {phoneSession.phone}</p>
                ) : (
                  <p className="mt-1 text-xs text-[var(--mist)]">Verify +234 on Me before paying</p>
                )}
              </div>

              <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--mist)]">
                To
              </label>
              <input
                className="field mt-2"
                placeholder="@alice or +2348012345678"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
              />
              {normalizeHandle(handle) ? (
                <p className="mono mt-2 truncate text-[10px] text-[var(--mist)]">
                  commit {handleCommit(handle)}
                </p>
              ) : null}

              <div className="mt-5 grid grid-cols-3 gap-2">
                {KEYS.map((k) => (
                  <button key={k} type="button" className="keypad-btn" onClick={() => onKey(k)}>
                    {k}
                  </button>
                ))}
              </div>

              <button type="button" className="primary-btn mt-5 w-full" disabled={!canSend} onClick={onSend}>
                {pending ? 'Sending…' : `Pay ${displayHandle(handle) || 'handle'}`}
              </button>
            </section>
          ) : null}

          {tab === 'me' ? (
            <section className="panel flex flex-1 flex-col gap-4 p-5">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold">+234 phone</h2>
                <p className="mt-2 text-sm text-[var(--mist)]">
                  +234 OTP proves your number (Africa&apos;s Talking sandbox, Termii, or mock). After
                  each pay, we post a signed attestation; CRE releases only when HMAC verifies.
                </p>
              </div>
              <input
                className="field"
                placeholder="+2348012345678"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                inputMode="tel"
                autoCapitalize="none"
              />
              <button
                type="button"
                className="primary-btn w-full"
                disabled={pending || phoneInput.trim().length < 10}
                onClick={onRequestOtp}
              >
                Send OTP
              </button>
              {otpPinId ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    className="field"
                    placeholder={demoPin ? `Code (${demoPin})` : 'SMS code'}
                    value={otpPin}
                    onChange={(e) => setOtpPin(e.target.value)}
                    inputMode="numeric"
                  />
                  <button
                    type="button"
                    className="primary-btn w-full sm:w-auto sm:px-6"
                    disabled={pending || otpPin.trim().length < 4}
                    onClick={onVerifyOtp}
                  >
                    Verify
                  </button>
                </div>
              ) : null}
              {phoneSession ? (
                <p className="text-sm text-[var(--mint)]">Verified {phoneSession.phone}</p>
              ) : null}

              <div className="mt-2 border-t border-white/10 pt-4">
                <h3 className="font-[family-name:var(--font-display)] text-xl font-bold">Your @</h3>
                <p className="mt-2 text-sm text-[var(--mist)]">
                  Register a name or +234 (as handle), or Link one you already own on another device.
                </p>
              </div>
              <input
                className="field"
                placeholder="@alice or +234…"
                value={myHandle}
                onChange={(e) => setMyHandle(e.target.value)}
                autoCapitalize="none"
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className="primary-btn w-full"
                  disabled={pending || normalizeHandle(myHandle).length < 2}
                  onClick={onRegisterHandle}
                >
                  Register {displayHandle(myHandle) || '@handle'}
                </button>
                <button
                  type="button"
                  className="ghost-btn w-full !border !border-white/15 !py-3.5"
                  disabled={pending || normalizeHandle(myHandle).length < 2}
                  onClick={onLinkHandle}
                >
                  Link existing
                </button>
              </div>
              {normalizeHandle(myHandle) ? (
                <p className="mono break-all text-[10px] text-[var(--mist)]">
                  {handleCommit(myHandle)}
                </p>
              ) : null}
            </section>
          ) : null}

          {tab === 'activity' ? (
            <section className="panel flex flex-1 flex-col p-5">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold">Activity</h2>
              {activity.length === 0 ? (
                <p className="mt-6 text-sm text-[var(--mist)]">No payments yet. Send your first $ to an @handle.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {activity.map((item) => (
                    <li key={item.id} className="border-b border-white/5 pb-3 last:border-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{item.title}</p>
                          <p className="mt-1 text-xs text-[var(--mist)]">{item.detail}</p>
                        </div>
                        <time className="shrink-0 text-[10px] text-[var(--mist)]">
                          {new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </time>
                      </div>
                      {item.hash ? (
                        <a
                          className="mono mt-2 inline-block text-xs text-[var(--mint)] underline-offset-2 hover:underline"
                          href={explorerTx(item.hash)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {shorten(item.hash)}
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}

          {status ? <StatusLine status={status} className="mt-4 text-center text-sm" /> : null}
        </>
      )}

      <footer className="mt-8 text-center text-[11px] text-[var(--mist)]">
        Dual-exit escrow · CRE writeReport · Mera PRF keys
      </footer>
    </div>
  )
}
