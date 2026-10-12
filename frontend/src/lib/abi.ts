export const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
] as const

export const gatewayAbi = [
  {
    type: 'function',
    name: 'openPayment',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'recipientCommit', type: 'bytes32' },
      { name: 'maxRiskScore', type: 'uint256' },
    ],
    outputs: [{ name: 'paymentId', type: 'bytes32' }],
  },
  {
    type: 'event',
    name: 'PaymentOpened',
    inputs: [
      { name: 'paymentId', type: 'bytes32', indexed: true },
      { name: 'payer', type: 'address', indexed: true },
      { name: 'recipientCommit', type: 'bytes32', indexed: true },
      { name: 'token', type: 'address', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'maxRiskScore', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
] as const

export const resolverAbi = [
  {
    type: 'function',
    name: 'registerHandle',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'handleHash', type: 'bytes32' },
      { name: 'recipient', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'resolve',
    stateMutability: 'view',
    inputs: [{ name: 'handleHash', type: 'bytes32' }],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'handleHash', type: 'bytes32' }],
    outputs: [{ type: 'address' }],
  },
] as const

export const faucetAbi = [
  {
    type: 'function',
    name: 'requestFunds',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }],
    outputs: [],
  },
] as const
