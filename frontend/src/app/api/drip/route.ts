import { NextResponse } from 'next/server'
import {
  createWalletClient,
  http,
  isAddress,
  parseEther,
  parseUnits,
  type Address,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { monadTestnet } from 'viem/chains'
import { AUSD } from '@/lib/addresses'
import { erc20Abi } from '@/lib/abi'

const recent = new Map<string, number>()
const COOLDOWN_MS = 60_000

const transferAbi = [
  ...erc20Abi,
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const

function privateKey(): Hex | undefined {
  const pk = process.env.PRIVATE_KEY
  if (pk && /^0x[0-9a-fA-F]{64}$/.test(pk)) return pk as Hex
  return undefined
}

export async function POST(req: Request) {
  const pk = privateKey()
  if (!pk) {
    return NextResponse.json(
      {
        error:
          'Local drip unavailable. Set PRIVATE_KEY in repo-root .env (loaded by next.config), or use Monad + Agora faucets.',
      },
      { status: 503 },
    )
  }

  let body: { address?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const to = body.address
  if (!to || !isAddress(to)) {
    return NextResponse.json({ error: 'Valid address required' }, { status: 400 })
  }

  const last = recent.get(to.toLowerCase()) ?? 0
  if (Date.now() - last < COOLDOWN_MS) {
    return NextResponse.json({ error: 'Cooldown — try again in a minute' }, { status: 429 })
  }

  const account = privateKeyToAccount(pk)
  const wallet = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(process.env.MONAD_RPC_URL ?? 'https://testnet-rpc.monad.xyz'),
  })

  try {
    const monHash = await wallet.sendTransaction({
      to: to as Address,
      value: parseEther('0.2'),
      gas: BigInt(100_000),
    })
    const ausdHash = await wallet.writeContract({
      address: AUSD,
      abi: transferAbi,
      functionName: 'transfer',
      args: [to as Address, parseUnits('25', 6)],
      gas: BigInt(120_000),
    })
    recent.set(to.toLowerCase(), Date.now())
    return NextResponse.json({
      ok: true,
      monHash,
      ausdHash,
      mon: '0.2',
      ausd: '25',
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Drip failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
