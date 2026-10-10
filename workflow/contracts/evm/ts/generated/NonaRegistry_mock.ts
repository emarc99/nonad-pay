// Code generated — DO NOT EDIT.
import type { Address } from 'viem'
import { addContractMock, type ContractMock, type EvmMock } from '@chainlink/cre-sdk/test'

import { NonaRegistryABI } from './NonaRegistry'

export type NonaRegistryMock = {
  encodeReport?: (paymentId: `0x${string}`, nullifier: `0x${string}`, recipientCommit: `0x${string}`, tier: number, expiry: bigint, approved: boolean) => `0x${string}`
  escrow?: () => `0x${string}`
  isNullifierSpent?: (nullifier: `0x${string}`) => boolean
  keystoneForwarder?: () => `0x${string}`
  owner?: () => `0x${string}`
  processedPayments?: (arg0: `0x${string}`) => boolean
  resolver?: () => `0x${string}`
  settledNullifiers?: (arg0: `0x${string}`) => boolean
  supportsInterface?: (interfaceId: `0x${string}`) => boolean
} & Pick<ContractMock<typeof NonaRegistryABI>, 'writeReport'>

export function newNonaRegistryMock(address: Address, evmMock: EvmMock): NonaRegistryMock {
  return addContractMock(evmMock, { address, abi: NonaRegistryABI }) as NonaRegistryMock
}

