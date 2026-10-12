import {
  parseUnits,
  type Abi,
  type Address,
  type Hex,
  type TransactionReceipt,
  type WalletClient,
} from 'viem'
import { AUSD, NONA_GATEWAY, PHONE_RESOLVER, AUSD_FAUCET } from './addresses'
import { erc20Abi, faucetAbi, gatewayAbi, resolverAbi } from './abi'
import { getWalletClient } from './mera'
import { displayHandle, handleCommit } from './handles'
import { publicClient } from './chain'

const ZERO = '0x0000000000000000000000000000000000000000' as const
/** Small headroom over estimateContractGas; avoid 800k blanket caps that strand low-MON wallets. */
const GAS_BUFFER_BPS = 12000n // +20%

function friendlyTxError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err)
  if (/insufficient balance|insufficient funds/i.test(msg)) {
    return new Error(
      'Not enough MON for gas. Tap Get test funds (or a Monad faucet), then retry. AUSD alone cannot pay fees.',
    )
  }
  return err instanceof Error ? err : new Error(msg)
}

async function waitSuccess(hash: Hex): Promise<TransactionReceipt> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') {
    throw new Error(`Transaction reverted · ${hash}`)
  }
  return receipt
}

async function writeWithEstimatedGas(params: {
  wallet: WalletClient
  address: Address
  abi: Abi
  functionName: string
  args: readonly unknown[]
  account: NonNullable<WalletClient['account']>
}) {
  const { wallet, address, abi, functionName, args, account } = params
  try {
    const estimated = await publicClient.estimateContractGas({
      address,
      abi,
      functionName,
      args: args as never,
      account,
    })
    const gas = (estimated * GAS_BUFFER_BPS) / 10000n
    const fees = await publicClient.estimateFeesPerGas()
    const maxFee = fees.maxFeePerGas ?? fees.gasPrice
    if (maxFee) {
      const need = gas * maxFee
      const bal = await publicClient.getBalance({ address: account.address })
      if (bal < need) {
        throw new Error(
          'Not enough MON for gas. Tap Get test funds (or a Monad faucet), then retry. AUSD alone cannot pay fees.',
        )
      }
    }
    return await wallet.writeContract({
      address,
      abi,
      functionName,
      args: args as never,
      chain: wallet.chain,
      account,
      gas,
    })
  } catch (e) {
    throw friendlyTxError(e)
  }
}

export async function registerHandle(rawHandle: string, recipient: Address) {
  const commit = handleCommit(rawHandle)
  const owner = await publicClient.readContract({
    address: PHONE_RESOLVER,
    abi: resolverAbi,
    functionName: 'ownerOf',
    args: [commit],
  })
  if (owner !== ZERO) {
    throw new Error(
      `${displayHandle(rawHandle)} is already taken (owner ${owner.slice(0, 6)}…${owner.slice(-4)}). Pick another @handle.`,
    )
  }

  const wallet = getWalletClient()
  // Simulate first so custom errors surface before spending gas when possible
  try {
    await publicClient.simulateContract({
      address: PHONE_RESOLVER,
      abi: resolverAbi,
      functionName: 'registerHandle',
      args: [commit, recipient],
      account: wallet.account!,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('HandleTaken')) {
      throw new Error(`${displayHandle(rawHandle)} is already taken. Pick another @handle.`)
    }
    throw e
  }

  const hash = await writeWithEstimatedGas({
    wallet,
    address: PHONE_RESOLVER,
    abi: resolverAbi,
    functionName: 'registerHandle',
    args: [commit, recipient],
    account: wallet.account!,
  })
  await waitSuccess(hash)
  return { hash, commit }
}

export async function sendToHandle(rawHandle: string, amountStr: string, maxRiskScore = BigInt(50)) {
  const commit = handleCommit(rawHandle)
  const amount = parseUnits(amountStr, 6)
  if (amount <= BigInt(0)) throw new Error('Enter an amount')

  const recipient = await publicClient.readContract({
    address: PHONE_RESOLVER,
    abi: resolverAbi,
    functionName: 'resolve',
    args: [commit],
  })
  if (recipient === ZERO) {
    throw new Error(
      `${displayHandle(rawHandle)} is not registered yet. Recipient must claim that @handle first (or CRE cannot release).`,
    )
  }

  const wallet = getWalletClient()
  const account = wallet.account!
  if (!account) throw new Error('Not signed in')

  const approveHash = await writeWithEstimatedGas({
    wallet,
    address: AUSD,
    abi: erc20Abi,
    functionName: 'approve',
    args: [NONA_GATEWAY, amount],
    account,
  })
  await waitSuccess(approveHash)

  const hash = await writeWithEstimatedGas({
    wallet,
    address: NONA_GATEWAY,
    abi: gatewayAbi,
    functionName: 'openPayment',
    args: [AUSD, amount, commit, maxRiskScore],
    account,
  })
  const receipt = await waitSuccess(hash)
  return { hash, commit, amount, receipt }
}

export async function requestAusdFaucet(to: Address) {
  const wallet = getWalletClient()
  const hash = await writeWithEstimatedGas({
    wallet,
    address: AUSD_FAUCET,
    abi: faucetAbi,
    functionName: 'requestFunds',
    args: [to],
    account: wallet.account!,
  })
  await waitSuccess(hash)
  return hash as Hex
}
