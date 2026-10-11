import type { Metadata, Viewport } from 'next'
import { Figtree, IBM_Plex_Mono, Syne } from 'next/font/google'
import './globals.css'

const syne = Syne({
  variable: '--font-syne',
  subsets: ['latin'],
  weight: ['600', '700', '800'],
})

const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

const ibm = IBM_Plex_Mono({
  variable: '--font-ibm',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'NonaPay — Cash App for AUSD remittances',
  description:
    'Send Agora AUSD to @handles on Monad. Mera Face ID onboarding. Chainlink CRE settles escrow.',
  applicationName: 'NonaPay',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'NonaPay',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#061410',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${syne.variable} ${figtree.variable} ${ibm.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  )
}
