import { createPublicClient, http, formatUnits, type Hex, type Address } from 'viem'
import { monadTestnet } from 'viem/chains'
import { AUSD, NONA_GATEWAY, P2P_ESCROW, PHONE_RESOLVER } from './addresses'
import { erc20Abi, gatewayAbi, resolverAbi } from './abi'

export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http('https://testnet-rpc.monad.xyz'),
})

export async function getAusdBalance(address: Address) {
  const bal = await publicClient.readContract({
    address: AUSD,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address],
  })
  return { raw: bal, formatted: formatUnits(bal, 6) }
}

export async function getMonBalance(address: Address) {
  const bal = await publicClient.getBalance({ address })
  return { raw: bal, formatted: formatUnits(bal, 18) }
}

export async function resolveHandle(commit: Hex) {
  return publicClient.readContract({
    address: PHONE_RESOLVER,
    abi: resolverAbi,
    functionName: 'resolve',
    args: [commit],
  })
}

export { AUSD, NONA_GATEWAY, P2P_ESCROW, PHONE_RESOLVER, gatewayAbi, erc20Abi, resolverAbi }
