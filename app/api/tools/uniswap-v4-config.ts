// Uniswap v4 contract addresses per chain
// Source: https://docs.uniswap.org/contracts/v4/deployments
export const UNISWAP_V4_CONTRACTS: Record<number, {
  positionManager: `0x${string}`;
  stateView: `0x${string}`;
  permit2: `0x${string}`;
}> = {
  // Ethereum mainnet
  1: {
    positionManager: '0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e',
    stateView: '0x7ffe42c4a5deea5b0fec41c94c136cf115597227',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  },
  // Arbitrum
  42161: {
    positionManager: '0xd88f38f930b7952f2db2432cb002e7abbf3dd869',
    stateView: '0x76fd297e2d437cd7f76d50f01afe6160f86e9990',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  },
  // Base
  8453: {
    positionManager: '0x7c5f5a4bbd8fd63184577525326123b519429bdc',
    stateView: '0xa3c0c9b65bad0b08107aa264b0f3db444b867a71',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  },
  // Polygon
  137: {
    positionManager: '0x1ec2ebf4f37e7363fdfe3551602425af0b3ceef9',
    stateView: '0x5ea1bd7974c8a611cbab0bdcafcb1d9cc9b3ba5a',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  },
  // Optimism
  10: {
    positionManager: '0x3c3ea4b57a46241e54610e5f022e5c45859a1017',
    stateView: '0xc18a3169788f4f75a170290584eca6395c75ecdb',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  },
  // Sepolia (testnet)
  11155111: {
    positionManager: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4',
    stateView: '0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  },
  // Base Sepolia (testnet)
  84532: {
    positionManager: '0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80',
    stateView: '0x571291b572ed32ce6751a2cb2486ebee8defb9b4',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  },
};

// Common token addresses per chain
export const COMMON_TOKENS: Record<number, Record<string, { address: `0x${string}`; decimals: number; symbol: string }>> = {
  1: {
    ETH: { address: '0x0000000000000000000000000000000000000000', decimals: 18, symbol: 'ETH' },
    WETH: { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18, symbol: 'WETH' },
    USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, symbol: 'USDC' },
    USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, symbol: 'USDT' },
  },
  42161: {
    ETH: { address: '0x0000000000000000000000000000000000000000', decimals: 18, symbol: 'ETH' },
    WETH: { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, symbol: 'WETH' },
    USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6, symbol: 'USDC' },
    USDT: { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6, symbol: 'USDT' },
  },
  8453: {
    ETH: { address: '0x0000000000000000000000000000000000000000', decimals: 18, symbol: 'ETH' },
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18, symbol: 'WETH' },
    USDC: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6, symbol: 'USDC' },
  },
  137: {
    WMATIC: { address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', decimals: 18, symbol: 'WMATIC' },
    USDC: { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6, symbol: 'USDC' },
    USDT: { address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6, symbol: 'USDT' },
    WETH: { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', decimals: 18, symbol: 'WETH' },
  },
  10: {
    ETH: { address: '0x0000000000000000000000000000000000000000', decimals: 18, symbol: 'ETH' },
    WETH: { address: '0x4200000000000000000000000000000000000006', decimals: 18, symbol: 'WETH' },
    USDC: { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', decimals: 6, symbol: 'USDC' },
  },
  11155111: {
    ETH: { address: '0x0000000000000000000000000000000000000000', decimals: 18, symbol: 'ETH' },
    USDC: { address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', decimals: 6, symbol: 'USDC' },
  },
  84532: {
    ETH: { address: '0x0000000000000000000000000000000000000000', decimals: 18, symbol: 'ETH' },
    USDC: { address: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', decimals: 6, symbol: 'USDC' },
  },
};

// Common fee tiers with their default tick spacing
export const COMMON_FEE_TIERS = [
  { fee: 500, tickSpacing: 10, label: '0.05%' },
  { fee: 3000, tickSpacing: 60, label: '0.3%' },
  { fee: 10000, tickSpacing: 200, label: '1%' },
] as const;

export const FEE_TO_TICK_SPACING: Record<number, number> = {
  100: 1,
  500: 10,
  3000: 60,
  10000: 200,
};

// Supported chains for Uniswap v4
export const UNISWAP_V4_CHAINS = [
  { chainId: 1, name: 'Ethereum' },
  { chainId: 42161, name: 'Arbitrum' },
  { chainId: 8453, name: 'Base' },
  { chainId: 137, name: 'Polygon' },
  { chainId: 10, name: 'Optimism' },
  { chainId: 11155111, name: 'Sepolia (testnet)' },
  { chainId: 84532, name: 'Base Sepolia (testnet)' },
] as const;

// Tick range presets (offset from current tick)
export const TICK_RANGE_PRESETS: Record<string, number> = {
  narrow: 100,
  medium: 500,
  full: 887272, // MAX_TICK
};

// ABIs

export const STATE_VIEW_ABI = [
  {
    name: 'getSlot0',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'protocolFee', type: 'uint24' },
      { name: 'lpFee', type: 'uint24' },
    ],
  },
  {
    name: 'getLiquidity',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'poolId', type: 'bytes32' }],
    outputs: [{ name: 'liquidity', type: 'uint128' }],
  },
] as const;

export const POSITION_MANAGER_ABI = [
  {
    name: 'modifyLiquidities',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'unlockData', type: 'bytes' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

export const PERMIT2_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint160' },
      { name: 'expiration', type: 'uint48' },
    ],
    outputs: [],
  },
] as const;

export const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;
