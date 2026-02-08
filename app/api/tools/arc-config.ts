import { defineChain } from 'viem';

// Arc Testnet chain definition for viem
// Arc uses USDC as native gas token (18 decimals for gas purposes)
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
});

// Gateway API endpoints
export const GATEWAY_API = {
  testnet: 'https://gateway-api-testnet.circle.com/v1',
  mainnet: 'https://gateway-api.circle.com/v1',
} as const;

// Gateway contract addresses (same address on all supported EVM chains)
export const GATEWAY_CONTRACTS = {
  testnet: {
    wallet: '0x0077777d7EBA4688BDeF3E311b846F25870A19B9' as const,
    minter: '0x0022222ABE238Cc2C7Bb1f21003F0a260052475B' as const,
  },
  mainnet: {
    wallet: '0x77777777Dcc4d5A8B6E418Fd04D8997ef11000eE' as const,
    minter: '0x2222222d7164433c4C09B0b0D809a9b52C04C205' as const,
  },
} as const;

// CCTP v2 domain IDs assigned by Circle
export const CCTP_DOMAINS: Record<number, number> = {
  // Testnet
  11155111: 0,  // Ethereum Sepolia
  43113: 1,     // Avalanche Fuji
  84532: 6,     // Base Sepolia
  5042002: 26,  // Arc Testnet
  // Mainnet
  1: 0,         // Ethereum
  43114: 1,     // Avalanche
  42161: 3,     // Arbitrum
  8453: 6,      // Base
  137: 7,       // Polygon PoS
  10: 2,        // Optimism
};

// CCTP v2 TokenMessengerV2 contract addresses
// Source: https://developers.circle.com/stablecoins/evm-smart-contracts
export const CCTP_TOKEN_MESSENGER: Record<number, `0x${string}`> = {
  // Testnet
  11155111: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // Sepolia
  84532: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',    // Base Sepolia
  5042002: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA',  // Arc Testnet
  // Mainnet
  1: '0xBd3fa81B58Ba92a82136038B25aDec7066af3155',        // Ethereum
  42161: '0x19330d10D9Cc8751218eaf51E8885D058642E08A',    // Arbitrum
  8453: '0x1682Ae6375C4E4A97e4B583BC394c861A46D8962',     // Base
  137: '0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE',      // Polygon
  10: '0x2B4069517957735bE00ceE0fadAE88a26365528f',       // Optimism
};

// USDC addresses per chain
export const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  // Testnet
  11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',    // Base Sepolia
  5042002: '0x3600000000000000000000000000000000000000',   // Arc Testnet (native USDC)
  43113: '0x5425890298aed601595a70AB815c96711a31Bc65',     // Avalanche Fuji
  // Mainnet
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',       // Ethereum
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',    // Arbitrum
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',     // Base
  137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',      // Polygon
  10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',       // Optimism
};

// Supported chains for Arc/Gateway integration
export const ARC_SUPPORTED_CHAINS = {
  testnet: [
    { chainId: 5042002, name: 'Arc Testnet', domain: 26, bridgeKitId: 'Arc_Testnet' },
    { chainId: 11155111, name: 'Ethereum Sepolia', domain: 0, bridgeKitId: 'Ethereum_Sepolia' },
    { chainId: 84532, name: 'Base Sepolia', domain: 6, bridgeKitId: 'Base_Sepolia' },
    { chainId: 43113, name: 'Avalanche Fuji', domain: 1, bridgeKitId: 'Avalanche_Fuji' },
  ],
  mainnet: [
    { chainId: 1, name: 'Ethereum', domain: 0, bridgeKitId: 'Ethereum' },
    { chainId: 42161, name: 'Arbitrum', domain: 3, bridgeKitId: 'Arbitrum' },
    { chainId: 8453, name: 'Base', domain: 6, bridgeKitId: 'Base' },
    { chainId: 137, name: 'Polygon PoS', domain: 7, bridgeKitId: 'Polygon_PoS' },
    { chainId: 10, name: 'OP Mainnet', domain: 2, bridgeKitId: 'OP_Mainnet' },
  ],
} as const;

// CCTP v2 MessageTransmitterV2 contract addresses
// Source: https://developers.circle.com/cctp/evm-smart-contracts
export const CCTP_MESSAGE_TRANSMITTER: Record<number, `0x${string}`> = {
  // Testnet (same address on all testnet chains via CREATE2)
  11155111: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
  84532: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
  5042002: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
  43113: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
  // Mainnet (same address on all mainnet chains via CREATE2)
  1: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
  42161: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
  8453: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
  137: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
  10: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
};

// Circle attestation API (Iris) endpoints
export const CCTP_ATTESTATION_API = {
  testnet: 'https://iris-api-sandbox.circle.com/v2/messages',
  mainnet: 'https://iris-api.circle.com/v2/messages',
} as const;

// Reverse lookup: domain ID → chain ID
export const DOMAIN_TO_CHAIN_ID: Record<number, number> = {
  // Testnet
  0: 11155111,  // Ethereum Sepolia
  1: 43113,     // Avalanche Fuji
  6: 84532,     // Base Sepolia
  26: 5042002,  // Arc Testnet
  // Mainnet
  // 0: 1,      // Ethereum (conflicts with testnet, handled by network context)
  // 1: 43114,  // Avalanche
  3: 42161,     // Arbitrum
  // 6: 8453,   // Base (conflicts with testnet)
  7: 137,       // Polygon PoS
  2: 10,        // Optimism
};

// ABIs

export const GATEWAY_WALLET_ABI = [
  {
    name: 'deposit',
    type: 'function',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

export const CCTP_TOKEN_MESSENGER_ABI = [
  {
    name: 'depositForBurn',
    type: 'function',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' },
      { name: 'destinationCaller', type: 'bytes32' },
      { name: 'maxFee', type: 'uint256' },
      { name: 'minFinalityThreshold', type: 'uint32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

export const MESSAGE_TRANSMITTER_ABI = [
  {
    name: 'receiveMessage',
    type: 'function',
    inputs: [
      { name: 'message', type: 'bytes' },
      { name: 'attestation', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

export const ERC20_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;
