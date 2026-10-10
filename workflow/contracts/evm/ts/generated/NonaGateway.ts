// Code generated — DO NOT EDIT.
import {
  decodeEventLog,
  decodeFunctionResult,
  encodeEventTopics,
  encodeFunctionData,
  zeroAddress,
} from 'viem'
import type { Address, Hex } from 'viem'
import {
  bytesToHex,
  encodeCallMsg,
  EVMClient,
  hexToBase64,
  LAST_FINALIZED_BLOCK_NUMBER,
  prepareReportRequest,
  type EVMLog,
  type Runtime,
} from '@chainlink/cre-sdk'

export interface DecodedLog<T> extends Omit<EVMLog, 'data'> { data: T }

const encodeTopicValue = (t: Hex | Hex[] | null): string[] => {
  if (t == null) return []
  if (Array.isArray(t)) return t.map(hexToBase64)
  return [hexToBase64(t)]
}





/**
 * Filter params for PaymentOpened. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type PaymentOpenedTopics = {
  paymentId?: `0x${string}`
  payer?: `0x${string}`
  recipientCommit?: `0x${string}`
}

/**
 * Decoded PaymentOpened event data.
 */
export type PaymentOpenedDecoded = {
  paymentId: `0x${string}`
  payer: `0x${string}`
  recipientCommit: `0x${string}`
  token: `0x${string}`
  amount: bigint
  maxRiskScore: bigint
  timestamp: bigint
}


export const NonaGatewayABI = [{"type":"constructor","inputs":[{"name":"escrow_","type":"address","internalType":"address"},{"name":"ausd_","type":"address","internalType":"address"}],"stateMutability":"nonpayable"},{"type":"function","name":"ausd","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"escrow","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contractP2PEscrow"}],"stateMutability":"view"},{"type":"function","name":"openPayment","inputs":[{"name":"token","type":"address","internalType":"address"},{"name":"amount","type":"uint256","internalType":"uint256"},{"name":"recipientCommit","type":"bytes32","internalType":"bytes32"},{"name":"maxRiskScore","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"paymentId","type":"bytes32","internalType":"bytes32"}],"stateMutability":"nonpayable"},{"type":"function","name":"openPaymentWithPermit","inputs":[{"name":"token","type":"address","internalType":"address"},{"name":"amount","type":"uint256","internalType":"uint256"},{"name":"recipientCommit","type":"bytes32","internalType":"bytes32"},{"name":"maxRiskScore","type":"uint256","internalType":"uint256"},{"name":"deadline","type":"uint256","internalType":"uint256"},{"name":"v","type":"uint8","internalType":"uint8"},{"name":"r","type":"bytes32","internalType":"bytes32"},{"name":"s","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"paymentId","type":"bytes32","internalType":"bytes32"}],"stateMutability":"nonpayable"},{"type":"function","name":"owner","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"paymentCount","inputs":[],"outputs":[{"name":"","type":"uint256","internalType":"uint256"}],"stateMutability":"view"},{"type":"event","name":"PaymentOpened","inputs":[{"name":"paymentId","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"payer","type":"address","indexed":true,"internalType":"address"},{"name":"recipientCommit","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"token","type":"address","indexed":false,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"maxRiskScore","type":"uint256","indexed":false,"internalType":"uint256"},{"name":"timestamp","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"error","name":"AddressEmptyCode","inputs":[{"name":"target","type":"address","internalType":"address"}]},{"type":"error","name":"AddressInsufficientBalance","inputs":[{"name":"account","type":"address","internalType":"address"}]},{"type":"error","name":"FailedInnerCall","inputs":[]},{"type":"error","name":"SafeERC20FailedOperation","inputs":[{"name":"token","type":"address","internalType":"address"}]},{"type":"error","name":"UnauthorizedCaller","inputs":[]},{"type":"error","name":"UnsupportedToken","inputs":[]},{"type":"error","name":"ZeroAddress","inputs":[]},{"type":"error","name":"ZeroAmount","inputs":[]}] as const

export class NonaGateway {
  constructor(
    private readonly client: EVMClient,
    public readonly address: Address,
  ) {}

  ausd(
    runtime: Runtime<unknown>,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: NonaGatewayABI,
      functionName: 'ausd' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: NonaGatewayABI,
      functionName: 'ausd' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  escrow(
    runtime: Runtime<unknown>,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: NonaGatewayABI,
      functionName: 'escrow' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: NonaGatewayABI,
      functionName: 'escrow' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  owner(
    runtime: Runtime<unknown>,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: NonaGatewayABI,
      functionName: 'owner' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: NonaGatewayABI,
      functionName: 'owner' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  paymentCount(
    runtime: Runtime<unknown>,
  ): bigint {
    const callData = encodeFunctionData({
      abi: NonaGatewayABI,
      functionName: 'paymentCount' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: NonaGatewayABI,
      functionName: 'paymentCount' as const,
      data: bytesToHex(result.data),
    }) as bigint
  }

  writeReportFromOpenPayment(
    runtime: Runtime<unknown>,
    token: `0x${string}`,
    amount: bigint,
    recipientCommit: `0x${string}`,
    maxRiskScore: bigint,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: NonaGatewayABI,
      functionName: 'openPayment' as const,
      args: [token, amount, recipientCommit, maxRiskScore],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReportFromOpenPaymentWithPermit(
    runtime: Runtime<unknown>,
    token: `0x${string}`,
    amount: bigint,
    recipientCommit: `0x${string}`,
    maxRiskScore: bigint,
    deadline: bigint,
    v: number,
    r: `0x${string}`,
    s: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: NonaGatewayABI,
      functionName: 'openPaymentWithPermit' as const,
      args: [token, amount, recipientCommit, maxRiskScore, deadline, v, r, s],
    })

    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  writeReport(
    runtime: Runtime<unknown>,
    callData: Hex,
    gasConfig?: { gasLimit?: string },
  ) {
    const reportResponse = runtime
      .report(prepareReportRequest(callData))
      .result()

    return this.client
      .writeReport(runtime, {
        receiver: this.address,
        report: reportResponse,
        gasConfig,
      })
      .result()
  }

  /**
   * Creates a log trigger for PaymentOpened events.
   * The returned trigger's adapt method decodes the raw log into PaymentOpenedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerPaymentOpened(
    filters?: PaymentOpenedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: NonaGatewayABI,
        eventName: 'PaymentOpened' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        paymentId: f.paymentId,
        payer: f.payer,
        recipientCommit: f.recipientCommit,
      }
      const encoded = encodeEventTopics({
        abi: NonaGatewayABI,
        eventName: 'PaymentOpened' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          paymentId: f.paymentId,
          payer: f.payer,
          recipientCommit: f.recipientCommit,
        }
        return encodeEventTopics({
          abi: NonaGatewayABI,
          eventName: 'PaymentOpened' as const,
          args,
        })
      })
      topics = allEncoded[0].map((_, i) => ({
        values: [...new Set(allEncoded.flatMap((row) => encodeTopicValue(row[i])))],
      }))
    }
    const baseTrigger = this.client.logTrigger({
      addresses: [hexToBase64(this.address)],
      topics,
    })
    const contract = this
    return {
      capabilityId: () => baseTrigger.capabilityId(),
      method: () => baseTrigger.method(),
      outputSchema: () => baseTrigger.outputSchema(),
      configAsAny: () => baseTrigger.configAsAny(),
      adapt: (rawOutput: EVMLog): DecodedLog<PaymentOpenedDecoded> => contract.decodePaymentOpened(rawOutput),
    }
  }

  /**
   * Decodes a log into PaymentOpened data, preserving all log metadata.
   */
  decodePaymentOpened(log: EVMLog): DecodedLog<PaymentOpenedDecoded> {
    const decoded = decodeEventLog({
      abi: NonaGatewayABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as PaymentOpenedDecoded }
  }
}

