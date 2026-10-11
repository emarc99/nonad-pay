export const MONAD_TESTNET = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: ['https://testnet-rpc.monad.xyz'] } },
  blockExplorers: {
    default: { name: 'MonadExplorer', url: 'https://testnet.monadexplorer.com' },
  },
} as const

export const AUSD = '0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC' as const
export const AUSD_FAUCET = '0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C' as const
export const NONA_GATEWAY = '0x421dCd87dc70d07589CA51200bf5Ec6065C12b8c' as const
export const PHONE_RESOLVER = '0x3953E210A6F81BBe5d9cAA0BD2Cc89dED255f95E' as const
export const P2P_ESCROW = '0x6C33f144264a480B3bd414Db39127deC91A3b69D' as const
export const NONA_REGISTRY = '0x9693aAd2540D75057D0CDce4c16891230D335A6B' as const
