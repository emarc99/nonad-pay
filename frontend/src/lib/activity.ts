export type ActivityItem = {
  id: string
  kind: 'send' | 'handle' | 'faucet' | 'drip' | 'otp' | 'attest'
  title: string
  detail: string
  hash?: string
  at: number
}

const KEY = 'nonapay.activity'

export function loadActivity(): ActivityItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ActivityItem[]) : []
  } catch {
    return []
  }
}

export function pushActivity(item: Omit<ActivityItem, 'id' | 'at'> & { id?: string; at?: number }) {
  const next: ActivityItem = {
    id: item.id ?? crypto.randomUUID(),
    at: item.at ?? Date.now(),
    kind: item.kind,
    title: item.title,
    detail: item.detail,
    hash: item.hash,
  }
  const list = [next, ...loadActivity()].slice(0, 40)
  localStorage.setItem(KEY, JSON.stringify(list))
  return list
}
