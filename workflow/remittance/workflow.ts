import {
	bigintToProtoBigInt,
	bytesToHex,
	cre,
	getNetwork,
	hexToBase64,
	protoBigIntToBigint,
	TxStatus,
	type TeeRuntime,
} from '@chainlink/cre-sdk'
import {
	type Address,
	encodeAbiParameters,
	encodeEventTopics,
	keccak256,
	parseAbiParameters,
	toBytes,
	type Hex,
} from 'viem'
import { z } from 'zod'
import {
	NonaGateway,
	NonaGatewayABI,
	type DecodedLog,
	type PaymentOpenedDecoded,
} from '../contracts/evm/ts/generated/NonaGateway'
import { NonaRegistry } from '../contracts/evm/ts/generated/NonaRegistry'

/**
 * NonaPay remittance CRE workflow.
 * - Log trigger on PaymentOpened (primary live path when DON delivers it)
 * - Cron polls recent PaymentOpened via filterLogs and settles unsettled ones (backup)
 */

export const configSchema = z.object({
	chainSelectorName: z.string(),
	gatewayAddress: z.string(),
	registryAddress: z.string(),
	gasLimit: z.string().default('600000'),
	maxRiskScore: z.number().default(80),
	nullifierSaltId: z.string().default('ENCLAVE_NULLIFIER_SALT'),
	fiatRelayTokenId: z.string().default('FIAT_RELAY_AUTH_TOKEN'),
	/** Optional single-ID override for local simulate --broadcast only. */
	demoPaymentId: z.string().optional(),
	demoRecipientCommit: z.string().optional(),
	demoPayer: z.string().optional(),
	demoAmount: z.string().optional(),
	schedule: z.string().default('0 */1 * * * *'),
	/** Recent blocks cron scans for PaymentOpened (keep under RPC range caps). */
	lookbackBlocks: z.number().default(90),
	/** Max unsettled payments to settle per cron tick. */
	maxSettlementsPerTick: z.number().default(3),
	enableLogTrigger: z.boolean().default(true),
})
type Config = z.infer<typeof configSchema>

type PaymentView = {
	paymentId: `0x${string}`
	payer: `0x${string}`
	recipientCommit: `0x${string}`
	amount: bigint
	maxRiskScore: bigint
}

function mockFiatAttestation(paymentId: `0x${string}`, relayToken: string) {
	const digest = keccak256(toBytes(`${paymentId}:${relayToken}:verified`))
	return { verified: Boolean(digest), phoneHint: '+2348012345678', tier: 1 as const }
}

function settlePayment(runtime: TeeRuntime<Config>, payment: PaymentView): string {
	const config = runtime.config

	let salt = 'nonapay-demo-nullifier-salt'
	let relayToken = 'nonapay-demo-fiat-relay'
	try {
		const saltSecret = runtime.getSecret({ id: config.nullifierSaltId }).result()
		if (saltSecret?.value) salt = String(saltSecret.value)
	} catch {
		runtime.log('Demo salt fallback')
	}
	try {
		const relaySecret = runtime.getSecret({ id: config.fiatRelayTokenId }).result()
		if (relaySecret?.value) relayToken = String(relaySecret.value)
	} catch {
		runtime.log('Demo fiat relay token fallback')
	}

	const fiat = mockFiatAttestation(payment.paymentId, relayToken)
	const approved = fiat.verified && Number(payment.maxRiskScore) <= config.maxRiskScore
	const nullifier = keccak256(
		toBytes(
			`${fiat.phoneHint}:${config.gatewayAddress.toLowerCase()}:${salt}:${payment.paymentId}`,
		),
	)
	const expiry = BigInt(Math.floor(Date.now() / 1000) + 3600)

	const reportData = encodeAbiParameters(
		parseAbiParameters(
			'bytes32 paymentId, bytes32 nullifier, bytes32 recipientCommit, uint8 tier, uint64 expiry, bool approved',
		),
		[payment.paymentId, nullifier, payment.recipientCommit, fiat.tier, expiry, approved],
	)

	runtime.log(
		`Report paymentId=${payment.paymentId} approved=${approved} nullifier=${nullifier}`,
	)

	const donRuntime = runtime.usingTheDons()

	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: config.chainSelectorName,
		isTestnet: true,
	})
	if (!network) throw new Error(`Network not found: ${config.chainSelectorName}`)

	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)
	const registry = new NonaRegistry(evmClient, config.registryAddress as Address)
	const writeResult = registry.writeReport(donRuntime, reportData, { gasLimit: config.gasLimit })

	if (writeResult.txStatus !== TxStatus.SUCCESS) {
		throw new Error(`writeReport failed: ${writeResult.errorMessage || writeResult.txStatus}`)
	}

	const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32))
	runtime.log(`Settlement report delivered tx=${txHash}`)
	return `Settled ${payment.paymentId} approved=${approved} tx=${txHash}`
}

export const onPaymentOpened = (
	runtime: TeeRuntime<Config>,
	payload: DecodedLog<PaymentOpenedDecoded>,
): string => {
	const { paymentId, payer, recipientCommit, amount, maxRiskScore } = payload.data
	runtime.log(`PaymentOpened ${paymentId} from ${payer} amount=${amount}`)
	return settlePayment(runtime, {
		paymentId: paymentId as `0x${string}`,
		payer: payer as `0x${string}`,
		recipientCommit: recipientCommit as `0x${string}`,
		amount: BigInt(amount),
		maxRiskScore: BigInt(maxRiskScore),
	})
}

/** Local simulate --broadcast helper: settle one explicit paymentId from config. */
function settleDemoOverride(runtime: TeeRuntime<Config>): string | undefined {
	const config = runtime.config
	if (!config.demoPaymentId || !config.demoRecipientCommit) return undefined

	const donRuntime = runtime.usingTheDons()
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: config.chainSelectorName,
		isTestnet: true,
	})
	if (!network) throw new Error(`Network not found: ${config.chainSelectorName}`)

	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)
	const registry = new NonaRegistry(evmClient, config.registryAddress as Address)
	const already = registry.processedPayments(donRuntime, config.demoPaymentId as `0x${string}`)
	if (already) {
		runtime.log(`demoPaymentId ${config.demoPaymentId} already settled — falling through to log poll`)
		return undefined
	}

	runtime.log('demoPaymentId override — settling configured payment')
	return settlePayment(runtime, {
		paymentId: config.demoPaymentId as `0x${string}`,
		payer: (config.demoPayer || '0x0000000000000000000000000000000000000001') as `0x${string}`,
		recipientCommit: config.demoRecipientCommit as `0x${string}`,
		amount: BigInt(config.demoAmount || '0'),
		maxRiskScore: BigInt(10),
	})
}

/**
 * Cron backup: scan recent PaymentOpened logs, settle unsettled payments.
 * New pays do not require editing demoPaymentId.
 */
export const onCronPoll = (runtime: TeeRuntime<Config>): string => {
	const override = settleDemoOverride(runtime)
	if (override) return override

	const config = runtime.config
	const donRuntime = runtime.usingTheDons()
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: config.chainSelectorName,
		isTestnet: true,
	})
	if (!network) throw new Error(`Network not found: ${config.chainSelectorName}`)

	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)
	const gateway = new NonaGateway(evmClient, config.gatewayAddress as Address)
	const registry = new NonaRegistry(evmClient, config.registryAddress as Address)

	const header = evmClient.headerByNumber(donRuntime, {}).result()
	if (!header.header?.blockNumber) throw new Error('headerByNumber missing blockNumber')
	const latest = protoBigIntToBigint(header.header.blockNumber)
	const from = latest > BigInt(config.lookbackBlocks) ? latest - BigInt(config.lookbackBlocks) : 0n

	const topic0 = encodeEventTopics({
		abi: NonaGatewayABI,
		eventName: 'PaymentOpened',
	})[0] as Hex

	const reply = evmClient
		.filterLogs(donRuntime, {
			filterQuery: {
				fromBlock: bigintToProtoBigInt(from),
				toBlock: bigintToProtoBigInt(latest),
				addresses: [hexToBase64(config.gatewayAddress as Hex)],
				topics: [{ topic: [hexToBase64(topic0)] }],
			},
		})
		.result()

	const logs = reply.logs ?? []
	runtime.log(`Cron poll blocks ${from}-${latest}: ${logs.length} PaymentOpened log(s)`)

	const results: string[] = []
	for (const raw of logs) {
		if (results.length >= config.maxSettlementsPerTick) break
		const decoded = gateway.decodePaymentOpened(raw)
		const paymentId = decoded.data.paymentId as `0x${string}`
		if (registry.processedPayments(donRuntime, paymentId)) {
			runtime.log(`skip settled ${paymentId}`)
			continue
		}
		results.push(
			settlePayment(runtime, {
				paymentId,
				payer: decoded.data.payer as `0x${string}`,
				recipientCommit: decoded.data.recipientCommit as `0x${string}`,
				amount: BigInt(decoded.data.amount),
				maxRiskScore: BigInt(decoded.data.maxRiskScore),
			}),
		)
	}

	if (results.length === 0) return `polled ${logs.length} log(s); nothing to settle`
	return results.join(' | ')
}

export function initWorkflow(config: Config) {
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: config.chainSelectorName,
		isTestnet: true,
	})
	if (!network) throw new Error(`Network not found: ${config.chainSelectorName}`)

	const cron = new cre.capabilities.CronCapability()
	const handlers = [
		cre.handlerInTee(cron.trigger({ schedule: config.schedule }), onCronPoll, {}),
	] as const

	if (config.enableLogTrigger) {
		const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)
		const gateway = new NonaGateway(evmClient, config.gatewayAddress as Address)
		return [
			...handlers,
			cre.handlerInTee(gateway.logTriggerPaymentOpened(), onPaymentOpened, {}),
		] as const
	}

	return handlers
}
