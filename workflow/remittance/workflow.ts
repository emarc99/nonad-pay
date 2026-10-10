import {
	bytesToHex,
	cre,
	getNetwork,
	TxStatus,
	type TeeRuntime,
} from '@chainlink/cre-sdk'
import {
	type Address,
	encodeAbiParameters,
	keccak256,
	parseAbiParameters,
	toBytes,
} from 'viem'
import { z } from 'zod'
import {
	NonaGateway,
	type DecodedLog,
	type PaymentOpenedDecoded,
} from '../contracts/evm/ts/generated/NonaGateway'
import { NonaRegistry } from '../contracts/evm/ts/generated/NonaRegistry'

/**
 * NonaPay remittance CRE workflow.
 * - handlerInTee + PaymentOpened log trigger (production path)
 * - cron simulate path writes the same report ABI (Monad sim engine log-trigger gap)
 */

export const configSchema = z.object({
	chainSelectorName: z.string(),
	gatewayAddress: z.string(),
	registryAddress: z.string(),
	gasLimit: z.string().default('600000'),
	maxRiskScore: z.number().default(80),
	nullifierSaltId: z.string().default('ENCLAVE_NULLIFIER_SALT'),
	fiatRelayTokenId: z.string().default('FIAT_RELAY_AUTH_TOKEN'),
	demoPaymentId: z.string().optional(),
	demoRecipientCommit: z.string().optional(),
	demoPayer: z.string().optional(),
	demoAmount: z.string().optional(),
	schedule: z.string().default('0 */1 * * * *'),
	/** Set true when CRE sim/runtime supports Monad log triggers for this tenant. */
	enableLogTrigger: z.boolean().default(false),
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
		toBytes(`${fiat.phoneHint}:${config.gatewayAddress.toLowerCase()}:${salt}`),
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

export const onCronSimulate = (runtime: TeeRuntime<Config>): string => {
	const config = runtime.config
	if (!config.demoPaymentId || !config.demoRecipientCommit) {
		throw new Error('demoPaymentId/demoRecipientCommit required for cron simulate path')
	}
	runtime.log('Cron simulate path — writing CRE report for demo PaymentOpened')
	return settlePayment(runtime, {
		paymentId: config.demoPaymentId as `0x${string}`,
		payer: (config.demoPayer || '0x0000000000000000000000000000000000000001') as `0x${string}`,
		recipientCommit: config.demoRecipientCommit as `0x${string}`,
		amount: BigInt(config.demoAmount || '0'),
		maxRiskScore: BigInt(10),
	})
}

export function initWorkflow(config: Config) {
	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: config.chainSelectorName,
		isTestnet: true,
	})
	if (!network) throw new Error(`Network not found: ${config.chainSelectorName}`)

	const cron = new cre.capabilities.CronCapability()

	// Monad EVM log-trigger capability is not yet available in local sim for this tenant.
	// Production deploy can flip enableLogTrigger once Chainlink enables it.
	if (config.enableLogTrigger) {
		const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)
		const gateway = new NonaGateway(evmClient, config.gatewayAddress as Address)
		return [
			cre.handlerInTee(cron.trigger({ schedule: config.schedule }), onCronSimulate, {}),
			cre.handlerInTee(gateway.logTriggerPaymentOpened(), onPaymentOpened, {}),
		] as const
	}

	return [cre.handlerInTee(cron.trigger({ schedule: config.schedule }), onCronSimulate, {})]
}
