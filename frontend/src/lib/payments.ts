import { parseUnits, type Address, type Hex } from 'viem'
import { AUSD, NONA_GATEWAY, PHONE_RESOLVER, AUSD_FAUCET } from './addresses'
import { erc20Abi, faucetAbi, gatewayAbi, resolverAbi } from './abi'
import { getWalletClient } from './mera'
import { handleCommit } from './handles'
import { publicClient } from './chain'

const GAS = BigInt(800_000)

export async function registerHandle(rawHandle: string, recipient: Address) {
  const commit = handleCommit(rawHandle)
  const wallet = getWalletClient()
  const hash = await wallet.writeContract({
    address: PHONE_RESOLVER,
    abi: resolverAbi,
    functionName: 'registerHandle',
    args: [commit, recipient],
    chain: wallet.chain,
    account: wallet.account!,
    gas: GAS,
  })
  await publicClient.waitForTransactionReceipt({ hash })
  return { hash, commit }
}

export async function sendToHandle(rawHandle: string, amountStr: string, maxRiskScore = BigInt(50)) {
  const commit = handleCommit(rawHandle)
  const amount = parseUnits(amountStr, 6)
  if (amount <= BigInt(0)) throw new Error('Enter an amount')
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
  await publicClient.waitForTransactionReceipt({ hash: approveHash })

  const hash = await wallet.writeContract({
    address: NONA_GATEWAY,
    abi: gatewayAbi,
    functionName: 'openPayment',
    args: [AUSD, amount, commit, maxRiskScore],
    chain: wallet.chain,
    account,
    gas: GAS,
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
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
  await publicClient.waitForTransactionReceipt({ hash })
  return hash as Hex
}
