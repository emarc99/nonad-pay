import { parseUnits, type Address, type Hex, type TransactionReceipt } from 'viem'
import { AUSD, NONA_GATEWAY, PHONE_RESOLVER, AUSD_FAUCET } from './addresses'
import { erc20Abi, faucetAbi, gatewayAbi, resolverAbi } from './abi'
import { getWalletClient } from './mera'
import { displayHandle, handleCommit } from './handles'
import { publicClient } from './chain'

const GAS = BigInt(800_000)
const ZERO = '0x0000000000000000000000000000000000000000' as const

async function waitSuccess(hash: Hex): Promise<TransactionReceipt> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success') {
    throw new Error(`Transaction reverted · ${hash}`)
  }
  return receipt
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

  const hash = await wallet.writeContract({
    address: PHONE_RESOLVER,
    abi: resolverAbi,
    functionName: 'registerHandle',
    args: [commit, recipient],
    chain: wallet.chain,
    account: wallet.account!,
    gas: GAS,
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

  const approveHash = await wallet.writeContract({
    address: AUSD,
    abi: erc20Abi,
    functionName: 'approve',
    args: [NONA_GATEWAY, amount],
    chain: wallet.chain,
    account,
    gas: GAS,
  })
  await waitSuccess(approveHash)

  const hash = await wallet.writeContract({
    address: NONA_GATEWAY,
    abi: gatewayAbi,
    functionName: 'openPayment',
    args: [AUSD, amount, commit, maxRiskScore],
    chain: wallet.chain,
    account,
    gas: GAS,
  })
  const receipt = await waitSuccess(hash)
  return { hash, commit, amount, receipt }
}

export async function requestAusdFaucet(to: Address) {
  const wallet = getWalletClient()
  const hash = await wallet.writeContract({
    address: AUSD_FAUCET,
    abi: faucetAbi,
    functionName: 'requestFunds',
    args: [to],
    chain: wallet.chain,
    account: wallet.account!,
    gas: GAS,
  })
  await waitSuccess(hash)
  return hash as Hex
}
