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
 * Filter params for ForwarderUpdated. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type ForwarderUpdatedTopics = {
  forwarder?: `0x${string}`
}

/**
 * Decoded ForwarderUpdated event data.
 */
export type ForwarderUpdatedDecoded = {
  forwarder: `0x${string}`
}


/**
 * Filter params for PaymentSettled. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type PaymentSettledTopics = {
  paymentId?: `0x${string}`
  nullifier?: `0x${string}`
}

/**
 * Decoded PaymentSettled event data.
 */
export type PaymentSettledDecoded = {
  paymentId: `0x${string}`
  nullifier: `0x${string}`
  recipient: `0x${string}`
  tier: number
  amount: bigint
}


/**
 * Filter params for RejectedReport. Only indexed fields can be used for filtering.
 * Indexed string/bytes must be passed as keccak256 hash (Hex).
 */
export type RejectedReportTopics = {
  paymentId?: `0x${string}`
  nullifier?: `0x${string}`
}

/**
 * Decoded RejectedReport event data.
 */
export type RejectedReportDecoded = {
  paymentId: `0x${string}`
  nullifier: `0x${string}`
  reason: string
}


export const NonaRegistryABI = [{"type":"constructor","inputs":[{"name":"forwarder_","type":"address","internalType":"address"},{"name":"escrow_","type":"address","internalType":"address"},{"name":"resolver_","type":"address","internalType":"address"}],"stateMutability":"nonpayable"},{"type":"function","name":"encodeReport","inputs":[{"name":"paymentId","type":"bytes32","internalType":"bytes32"},{"name":"nullifier","type":"bytes32","internalType":"bytes32"},{"name":"recipientCommit","type":"bytes32","internalType":"bytes32"},{"name":"tier","type":"uint8","internalType":"uint8"},{"name":"expiry","type":"uint64","internalType":"uint64"},{"name":"approved","type":"bool","internalType":"bool"}],"outputs":[{"name":"","type":"bytes","internalType":"bytes"}],"stateMutability":"pure"},{"type":"function","name":"escrow","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contractP2PEscrow"}],"stateMutability":"view"},{"type":"function","name":"isNullifierSpent","inputs":[{"name":"nullifier","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"keystoneForwarder","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"onReport","inputs":[{"name":"","type":"bytes","internalType":"bytes"},{"name":"report","type":"bytes","internalType":"bytes"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"owner","inputs":[],"outputs":[{"name":"","type":"address","internalType":"address"}],"stateMutability":"view"},{"type":"function","name":"processedPayments","inputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"resolver","inputs":[],"outputs":[{"name":"","type":"address","internalType":"contractPhoneResolver"}],"stateMutability":"view"},{"type":"function","name":"setForwarder","inputs":[{"name":"forwarder_","type":"address","internalType":"address"}],"outputs":[],"stateMutability":"nonpayable"},{"type":"function","name":"settledNullifiers","inputs":[{"name":"","type":"bytes32","internalType":"bytes32"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"function","name":"supportsInterface","inputs":[{"name":"interfaceId","type":"bytes4","internalType":"bytes4"}],"outputs":[{"name":"","type":"bool","internalType":"bool"}],"stateMutability":"view"},{"type":"event","name":"ForwarderUpdated","inputs":[{"name":"forwarder","type":"address","indexed":true,"internalType":"address"}],"anonymous":false},{"type":"event","name":"PaymentSettled","inputs":[{"name":"paymentId","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"nullifier","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"recipient","type":"address","indexed":false,"internalType":"address"},{"name":"tier","type":"uint8","indexed":false,"internalType":"uint8"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},{"type":"event","name":"RejectedReport","inputs":[{"name":"paymentId","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"nullifier","type":"bytes32","indexed":true,"internalType":"bytes32"},{"name":"reason","type":"string","indexed":false,"internalType":"string"}],"anonymous":false},{"type":"error","name":"InvalidEnclaveReport","inputs":[]},{"type":"error","name":"NullifierAlreadySpent","inputs":[]},{"type":"error","name":"PaymentAlreadyProcessed","inputs":[]},{"type":"error","name":"RecipientUnresolved","inputs":[]},{"type":"error","name":"UnauthorizedCaller","inputs":[]},{"type":"error","name":"UnauthorizedForwarder","inputs":[{"name":"caller","type":"address","internalType":"address"}]},{"type":"error","name":"ZeroAddress","inputs":[]}] as const

export class NonaRegistry {
  constructor(
    private readonly client: EVMClient,
    public readonly address: Address,
  ) {}

  encodeReport(
    runtime: Runtime<unknown>,
    paymentId: `0x${string}`,
    nullifier: `0x${string}`,
    recipientCommit: `0x${string}`,
    tier: number,
    expiry: bigint,
    approved: boolean,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: NonaRegistryABI,
      functionName: 'encodeReport' as const,
      args: [paymentId, nullifier, recipientCommit, tier, expiry, approved],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: NonaRegistryABI,
      functionName: 'encodeReport' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  escrow(
    runtime: Runtime<unknown>,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: NonaRegistryABI,
      functionName: 'escrow' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: NonaRegistryABI,
      functionName: 'escrow' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  isNullifierSpent(
    runtime: Runtime<unknown>,
    nullifier: `0x${string}`,
  ): boolean {
    const callData = encodeFunctionData({
      abi: NonaRegistryABI,
      functionName: 'isNullifierSpent' as const,
      args: [nullifier],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: NonaRegistryABI,
      functionName: 'isNullifierSpent' as const,
      data: bytesToHex(result.data),
    }) as boolean
  }

  keystoneForwarder(
    runtime: Runtime<unknown>,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: NonaRegistryABI,
      functionName: 'keystoneForwarder' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: NonaRegistryABI,
      functionName: 'keystoneForwarder' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  owner(
    runtime: Runtime<unknown>,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: NonaRegistryABI,
      functionName: 'owner' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: NonaRegistryABI,
      functionName: 'owner' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  processedPayments(
    runtime: Runtime<unknown>,
    arg0: `0x${string}`,
  ): boolean {
    const callData = encodeFunctionData({
      abi: NonaRegistryABI,
      functionName: 'processedPayments' as const,
      args: [arg0],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: NonaRegistryABI,
      functionName: 'processedPayments' as const,
      data: bytesToHex(result.data),
    }) as boolean
  }

  resolver(
    runtime: Runtime<unknown>,
  ): `0x${string}` {
    const callData = encodeFunctionData({
      abi: NonaRegistryABI,
      functionName: 'resolver' as const,
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: NonaRegistryABI,
      functionName: 'resolver' as const,
      data: bytesToHex(result.data),
    }) as `0x${string}`
  }

  settledNullifiers(
    runtime: Runtime<unknown>,
    arg0: `0x${string}`,
  ): boolean {
    const callData = encodeFunctionData({
      abi: NonaRegistryABI,
      functionName: 'settledNullifiers' as const,
      args: [arg0],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: NonaRegistryABI,
      functionName: 'settledNullifiers' as const,
      data: bytesToHex(result.data),
    }) as boolean
  }

  supportsInterface(
    runtime: Runtime<unknown>,
    interfaceId: `0x${string}`,
  ): boolean {
    const callData = encodeFunctionData({
      abi: NonaRegistryABI,
      functionName: 'supportsInterface' as const,
      args: [interfaceId],
    })

    const result = this.client
      .callContract(runtime, {
        call: encodeCallMsg({ from: zeroAddress, to: this.address, data: callData }),
        blockNumber: LAST_FINALIZED_BLOCK_NUMBER,
      })
      .result()

    return decodeFunctionResult({
      abi: NonaRegistryABI,
      functionName: 'supportsInterface' as const,
      data: bytesToHex(result.data),
    }) as boolean
  }

  writeReportFromOnReport(
    runtime: Runtime<unknown>,
    arg0: `0x${string}`,
    report: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: NonaRegistryABI,
      functionName: 'onReport' as const,
      args: [arg0, report],
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

  writeReportFromSetForwarder(
    runtime: Runtime<unknown>,
    forwarder: `0x${string}`,
    gasConfig?: { gasLimit?: string },
  ) {
    const callData = encodeFunctionData({
      abi: NonaRegistryABI,
      functionName: 'setForwarder' as const,
      args: [forwarder],
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
   * Creates a log trigger for ForwarderUpdated events.
   * The returned trigger's adapt method decodes the raw log into ForwarderUpdatedDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerForwarderUpdated(
    filters?: ForwarderUpdatedTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: NonaRegistryABI,
        eventName: 'ForwarderUpdated' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        forwarder: f.forwarder,
      }
      const encoded = encodeEventTopics({
        abi: NonaRegistryABI,
        eventName: 'ForwarderUpdated' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          forwarder: f.forwarder,
        }
        return encodeEventTopics({
          abi: NonaRegistryABI,
          eventName: 'ForwarderUpdated' as const,
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
      adapt: (rawOutput: EVMLog): DecodedLog<ForwarderUpdatedDecoded> => contract.decodeForwarderUpdated(rawOutput),
    }
  }

  /**
   * Decodes a log into ForwarderUpdated data, preserving all log metadata.
   */
  decodeForwarderUpdated(log: EVMLog): DecodedLog<ForwarderUpdatedDecoded> {
    const decoded = decodeEventLog({
      abi: NonaRegistryABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as ForwarderUpdatedDecoded }
  }

  /**
   * Creates a log trigger for PaymentSettled events.
   * The returned trigger's adapt method decodes the raw log into PaymentSettledDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerPaymentSettled(
    filters?: PaymentSettledTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: NonaRegistryABI,
        eventName: 'PaymentSettled' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        paymentId: f.paymentId,
        nullifier: f.nullifier,
      }
      const encoded = encodeEventTopics({
        abi: NonaRegistryABI,
        eventName: 'PaymentSettled' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          paymentId: f.paymentId,
          nullifier: f.nullifier,
        }
        return encodeEventTopics({
          abi: NonaRegistryABI,
          eventName: 'PaymentSettled' as const,
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
      adapt: (rawOutput: EVMLog): DecodedLog<PaymentSettledDecoded> => contract.decodePaymentSettled(rawOutput),
    }
  }

  /**
   * Decodes a log into PaymentSettled data, preserving all log metadata.
   */
  decodePaymentSettled(log: EVMLog): DecodedLog<PaymentSettledDecoded> {
    const decoded = decodeEventLog({
      abi: NonaRegistryABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as PaymentSettledDecoded }
  }

  /**
   * Creates a log trigger for RejectedReport events.
   * The returned trigger's adapt method decodes the raw log into RejectedReportDecoded,
   * so the handler receives typed event data directly.
   * When multiple filters are provided, topic values are merged with OR semantics (match any).
   */
  logTriggerRejectedReport(
    filters?: RejectedReportTopics[],
  ) {
    let topics: { values: string[] }[]
    if (!filters || filters.length === 0) {
      const encoded = encodeEventTopics({
        abi: NonaRegistryABI,
        eventName: 'RejectedReport' as const,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else if (filters.length === 1) {
      const f = filters[0]
      const args = {
        paymentId: f.paymentId,
        nullifier: f.nullifier,
      }
      const encoded = encodeEventTopics({
        abi: NonaRegistryABI,
        eventName: 'RejectedReport' as const,
        args,
      })
      topics = encoded.map((t) => ({ values: encodeTopicValue(t) }))
    } else {
      const allEncoded = filters.map((f) => {
        const args = {
          paymentId: f.paymentId,
          nullifier: f.nullifier,
        }
        return encodeEventTopics({
          abi: NonaRegistryABI,
          eventName: 'RejectedReport' as const,
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
      adapt: (rawOutput: EVMLog): DecodedLog<RejectedReportDecoded> => contract.decodeRejectedReport(rawOutput),
    }
  }

  /**
   * Decodes a log into RejectedReport data, preserving all log metadata.
   */
  decodeRejectedReport(log: EVMLog): DecodedLog<RejectedReportDecoded> {
    const decoded = decodeEventLog({
      abi: NonaRegistryABI,
      data: bytesToHex(log.data),
      topics: log.topics.map((t) => bytesToHex(t)) as [Hex, ...Hex[]],
    })
    const { data: _, ...rest } = log
    return { ...rest, data: decoded.args as unknown as RejectedReportDecoded }
  }
}

