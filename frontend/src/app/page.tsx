'use client'

import { useEffect, useState, useTransition } from 'react'
import type { Hex } from 'viem'
import { createAccount, signIn, signOut } from '@/lib/mera'
import { getAusdBalance, getMonBalance } from '@/lib/chain'
import { displayHandle, handleCommit, normalizeHandle } from '@/lib/handles'
import { registerHandle, requestAusdFaucet, sendToHandle } from '@/lib/payments'
import { loadActivity, pushActivity, type ActivityItem } from '@/lib/activity'

type Tab = 'send' | 'me' | 'activity'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'] as const

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function explorerTx(hash: string) {
  return `https://testnet.monadexplorer.com/tx/${hash}`
}

export default function Home() {
  const [address, setAddress] = useState<Hex | undefined>()
  const [ausd, setAusd] = useState('0')
  const [mon, setMon] = useState('0')
  const [amount, setAmount] = useState('0')
  const [handle, setHandle] = useState('')
  const [myHandle, setMyHandle] = useState('')
  const [tab, setTab] = useState<Tab>('send')
  const [status, setStatus] = useState<{ tone: 'ok' | 'err' | 'info'; text: string } | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [amountKey, setAmountKey] = useState(0)
  const [pending, startTransition] = useTransition()

  async function refreshBalances(addr: Hex) {
    const [a, m] = await Promise.all([getAusdBalance(addr), getMonBalance(addr)])
    setAusd(Number(a.formatted).toLocaleString(undefined, { maximumFractionDigits: 2 }))
    setMon(Number(m.formatted).toLocaleString(undefined, { maximumFractionDigits: 4 }))
  }

  useEffect(() => {
    setActivity(loadActivity())
    const saved = localStorage.getItem('nonapay.myHandle')
    if (saved) setMyHandle(saved)
  }, [])

  useEffect(() => {
    if (!address) return
    void refreshBalances(address).catch(() => undefined)
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
      setStatus({ tone: 'ok', text: `Account ready · ${shorten(addr)}` })
    })
  }

  function onSignIn() {
    run('Touch Face ID / passkey…', async () => {
      const addr = await signIn('spend')
      setAddress(addr)
      setStatus({ tone: 'ok', text: `Signed in · ${shorten(addr)}` })
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
      const { hash, commit } = await sendToHandle(handle, amount)
      const list = pushActivity({
        kind: 'send',
        title: `Sent $${amount} to ${displayHandle(handle)}`,
        detail: `commit ${commit.slice(0, 10)}…`,
        hash,
      })
      setActivity(list)
      setStatus({ tone: 'ok', text: `Payment opened · ${shorten(hash)}` })
      setAmount('0')
      await refreshBalances(address)
    })
  }

  function onRegisterHandle() {
    if (!address) return
    run('Registering @handle…', async () => {
      const { hash, commit } = await registerHandle(myHandle, address)
      localStorage.setItem('nonapay.myHandle', normalizeHandle(myHandle))
      const list = pushActivity({
        kind: 'handle',
        title: `Claimed ${displayHandle(myHandle)}`,
        detail: `commit ${commit.slice(0, 10)}…`,
        hash,
      })
      setActivity(list)
      setStatus({ tone: 'ok', text: `${displayHandle(myHandle)} registered` })
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
      setStatus({ tone: 'ok', text: `Faucet tx · ${shorten(hash)}` })
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
      const list = pushActivity({
        kind: 'drip',
        title: `Drip ${data.mon} MON + ${data.ausd} AUSD`,
        detail: 'Local demo faucet',
        hash: data.monHash,
      })
      setActivity(list)
      setStatus({ tone: 'ok', text: 'Test funds landed' })
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
            Face ID in. Send dollars to an @handle. CRE unlocks the escrow.
          </p>
        </div>
        {address ? (
          <button type="button" className="ghost-btn text-xs" onClick={onSignOut}>
            Sign out
          </button>
        ) : null}
      </header>

      {!address ? (
        <section className="panel anim-rise-delay flex flex-1 flex-col justify-center gap-5 p-6">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
              One passkey. Real AUSD.
            </h2>
            <p className="mt-2 text-sm text-[var(--mist)]">
              Mera derives your spend key from Face ID / fingerprint. No seed phrase.
            </p>
          </div>
          <button type="button" className="primary-btn btn-pulse w-full text-base" disabled={pending} onClick={onCreate}>
            Create with Face ID
          </button>
          <button type="button" className="ghost-btn w-full" disabled={pending} onClick={onSignIn}>
            I already have a passkey
          </button>
          {status ? (
            <p className={`text-sm ${status.tone === 'err' ? 'status-err' : status.tone === 'ok' ? 'status-ok' : 'text-[var(--mist)]'}`}>
              {status.text}
            </p>
          ) : null}
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
              ['me', 'My @'],
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
                <p className="mt-1 text-xs text-[var(--mist)]">Locks in dual-exit escrow · 15m reclaim</p>
              </div>

              <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.12em] text-[var(--mist)]">
                To
              </label>
              <input
                className="field mt-2"
                placeholder="@amina"
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
                <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold">Claim your @</h2>
                <p className="mt-2 text-sm text-[var(--mist)]">
                  Registers an opaque handle hash on PhoneResolver. Raw phone never hits the chain.
                </p>
              </div>
              <input
                className="field"
                placeholder="@yourname"
                value={myHandle}
                onChange={(e) => setMyHandle(e.target.value)}
                autoCapitalize="none"
              />
              <button
                type="button"
                className="primary-btn w-full"
                disabled={pending || normalizeHandle(myHandle).length < 2}
                onClick={onRegisterHandle}
              >
                Register {displayHandle(myHandle) || '@handle'}
              </button>
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

          {status ? (
            <p
              className={`mt-4 text-center text-sm ${
                status.tone === 'err' ? 'status-err' : status.tone === 'ok' ? 'status-ok' : 'text-[var(--mist)]'
              }`}
            >
              {status.text}
            </p>
          ) : null}
        </>
      )}

      <footer className="mt-8 text-center text-[11px] text-[var(--mist)]">
        Dual-exit escrow · CRE writeReport · Mera PRF keys
      </footer>
    </div>
  )
}
