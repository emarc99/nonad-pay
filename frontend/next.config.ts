import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { NextConfig } from 'next'

/** Load selected keys from repo-root .env into process.env for local drip API. */
function loadRootEnv() {
  for (const rel of ['../.env', '../../.env']) {
    const path = resolve(/* turbopackIgnore: true */ process.cwd(), rel)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      if (!line || line.startsWith('#') || !line.includes('=')) continue
      const i = line.indexOf('=')
      const key = line.slice(0, i).trim()
      const value = line.slice(i + 1).trim()
      if (!key || process.env[key]) continue
      if (key === 'PRIVATE_KEY' || key === 'MONAD_RPC_URL') {
        process.env[key] = value
      }
    }
    break
  }
}

loadRootEnv()

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  env: {
    // Expose only non-secret RPC to client if needed later; PRIVATE_KEY stays server-side via process.env
    MONAD_RPC_URL: process.env.MONAD_RPC_URL ?? 'https://testnet-rpc.monad.xyz',
  },
}

export default nextConfig
