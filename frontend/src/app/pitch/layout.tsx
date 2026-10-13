import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NonaPay — Pitch',
  description:
    'Pitch deck: Cash App for AUSD remittances on Monad. Mera passkeys, CRE criteria, 15m reclaim.',
}

export default function PitchLayout({ children }: { children: React.ReactNode }) {
  return children
}
