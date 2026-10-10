// Code generated — DO NOT EDIT.
import type { Address } from 'viem'
import { addContractMock, type ContractMock, type EvmMock } from '@chainlink/cre-sdk/test'

import { NonaGatewayABI } from './NonaGateway'

export type NonaGatewayMock = {
  ausd?: () => `0x${string}`
  escrow?: () => `0x${string}`
  owner?: () => `0x${string}`
  paymentCount?: () => bigint
} & Pick<ContractMock<typeof NonaGatewayABI>, 'writeReport'>

export function newNonaGatewayMock(address: Address, evmMock: EvmMock): NonaGatewayMock {
  return addContractMock(evmMock, { address, abi: NonaGatewayABI }) as NonaGatewayMock
}

