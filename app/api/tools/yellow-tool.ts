import { z } from 'zod';
import { tool } from 'ai';
import { encodeFunctionData, maxUint256 } from 'viem';

// Yellow Network ClearNode endpoints
const CLEARNODE_ENDPOINTS = {
  production: 'wss://clearnet.yellow.com/ws',
  sandbox: 'wss://clearnet-sandbox.yellow.com/ws',
} as const;

// Supported chains for Yellow Network state channels
const YELLOW_SUPPORTED_CHAINS = [
  { chainId: 1, name: 'Ethereum' },
  { chainId: 42161, name: 'Arbitrum' },
  { chainId: 8453, name: 'Base' },
] as const;

// Yellow Network contract addresses (same on all chains via deterministic deployment)
const YELLOW_CONTRACTS = {
  custody: '0x490fb189DdE3a01B00be9BA5F41e3447FbC838b6' as const,
  adjudicator: '0xcbbc03a873c11beeFA8D99477E830be48d8Ae6D7' as const,
  balanceChecker: '0x2352c63A83f9Fd126af8676146721Fa00924d7e4' as const,
};

// Common token addresses per chain (USDC for state channels)
const USDC_ADDRESSES: Record<number, string> = {
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',     // Ethereum
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',  // Base
};

// ABI fragments for Yellow Network contracts
const CUSTODY_ABI = [
  {
    name: 'deposit',
    type: 'function',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'withdraw',
    type: 'function',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'token', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const ERC20_APPROVE_ABI = [
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

export const getYellowNetworkInfo = tool({
  description:
    'Get information about Yellow Network state channels. Use this when the user asks about instant transactions, gas-free operations, Yellow Network, or state channels. Also use when explaining the benefits of session-based DeFi.',
  parameters: z.object({}),
  execute: async () => {
    return {
      success: true,
      name: 'Yellow Network',
      description: 'State channel protocol for instant, gas-free DeFi operations',
      benefits: [
        'Instant finality — transactions settle immediately between parties',
        'Zero gas fees — operations happen off-chain',
        'High throughput — thousands of transactions per second',
        'Same security — cryptographic proofs backed by on-chain settlement',
      ],
      howItWorks: [
        '1. Open a session by depositing funds into a state channel (one-time gas cost)',
        '2. Execute unlimited instant operations off-chain (no gas, no waiting)',
        '3. Close the session to settle final balances on-chain (one-time gas cost)',
      ],
      supportedChains: YELLOW_SUPPORTED_CHAINS,
      endpoints: CLEARNODE_ENDPOINTS,
      useCases: [
        'High-frequency trading without gas costs',
        'Micropayments and streaming payments',
        'Gaming with instant in-game transactions',
        'Batch multiple DeFi operations in seconds',
      ],
    };
  },
});

export const getYellowSessionStatus = tool({
  description:
    'Check the current Yellow Network session status. Use this when the user asks about their session, session balance, or wants to know if they have an active Yellow session.',
  parameters: z.object({
    sessionActive: z.boolean().describe('Whether a Yellow session is currently active (passed from frontend state)'),
    channelId: z.string().optional().describe('The active channel ID if session is open'),
    sessionBalance: z.string().optional().describe('Current session balance in smallest unit'),
    tokenSymbol: z.string().optional().describe('Token symbol for the session (e.g., USDC)'),
    tokenDecimals: z.number().optional().describe('Token decimals for formatting'),
  }),
  execute: async ({ sessionActive, channelId, sessionBalance, tokenSymbol, tokenDecimals }) => {
    if (!sessionActive) {
      return {
        success: true,
        status: 'inactive',
        message: 'No active Yellow session. Open a session to enable instant, gas-free operations.',
        suggestion: 'Say "Open a Yellow session with [amount] USDC" to get started.',
      };
    }

    const formattedBalance = sessionBalance && tokenDecimals
      ? formatAmount(sessionBalance, tokenDecimals)
      : sessionBalance || '0';

    return {
      success: true,
      status: 'active',
      channelId,
      balance: {
        raw: sessionBalance,
        formatted: formattedBalance,
        symbol: tokenSymbol || 'USDC',
      },
      message: `Yellow session is active with ${formattedBalance} ${tokenSymbol || 'USDC'}. You can execute instant operations.`,
      capabilities: [
        'Instant transfers (no gas)',
        'Batch operations',
        'Real-time balance updates',
      ],
    };
  },
});

// Helper to format token amounts
function formatAmount(amount: string, decimals: number): string {
  const value = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 6);
  return `${integerPart}.${fractionalStr}`.replace(/\.?0+$/, '') || '0';
}

export const buildYellowDepositTx = tool({
  description:
    'Build transactions to deposit funds into Yellow Network for instant operations. Returns approve + deposit transactions. Use when user wants to "open a Yellow session", "deposit into Yellow", or "enable instant transactions".',
  parameters: z.object({
    userAddress: z.string().describe('The user wallet address'),
    chainId: z.number().describe('Chain ID (1 = Ethereum, 42161 = Arbitrum, 8453 = Base)'),
    amount: z.string().describe('Amount to deposit in smallest unit (e.g., 1000000 for 1 USDC)'),
    tokenAddress: z.string().optional().describe('Token address to deposit. Defaults to USDC on the selected chain.'),
  }),
  execute: async ({ userAddress, chainId, amount, tokenAddress }) => {
    try {
      // Validate chain is supported
      const supportedChain = YELLOW_SUPPORTED_CHAINS.find(c => c.chainId === chainId);
      if (!supportedChain) {
        return {
          success: false,
          error: `Chain ${chainId} not supported. Yellow Network supports: ${YELLOW_SUPPORTED_CHAINS.map(c => c.name).join(', ')}`,
        };
      }

      // Use provided token or default to USDC
      const token = tokenAddress || USDC_ADDRESSES[chainId];
      if (!token) {
        return {
          success: false,
          error: `No default USDC address for chain ${chainId}. Please provide a token address.`,
        };
      }

      // Build approve transaction
      const approveData = encodeFunctionData({
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [YELLOW_CONTRACTS.custody, maxUint256],
      });

      // Build deposit transaction
      const depositData = encodeFunctionData({
        abi: CUSTODY_ABI,
        functionName: 'deposit',
        args: [token as `0x${string}`, BigInt(amount)],
      });

      const formattedAmount = formatAmount(amount, 6); // Assuming USDC with 6 decimals

      return {
        success: true,
        chainId,
        chainName: supportedChain.name,
        depositAmount: {
          raw: amount,
          formatted: formattedAmount,
          symbol: 'USDC',
        },
        transactions: [
          {
            step: 1,
            name: 'Approve USDC',
            description: 'Allow Yellow Network custody contract to spend your USDC',
            to: token,
            data: approveData,
            value: '0',
          },
          {
            step: 2,
            name: 'Deposit to Yellow',
            description: `Deposit ${formattedAmount} USDC into Yellow Network state channel`,
            to: YELLOW_CONTRACTS.custody,
            data: depositData,
            value: '0',
          },
        ],
        contracts: {
          custody: YELLOW_CONTRACTS.custody,
          token,
        },
        nextStep: 'After depositing, connect to ClearNode WebSocket to start instant operations.',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to build deposit transaction';
      return {
        success: false,
        error: message,
      };
    }
  },
});

export const buildYellowWithdrawTx = tool({
  description:
    'Build a transaction to withdraw funds from Yellow Network back to your wallet. Use when user wants to "close Yellow session", "withdraw from Yellow", or "exit state channel".',
  parameters: z.object({
    userAddress: z.string().describe('The user wallet address'),
    chainId: z.number().describe('Chain ID (1 = Ethereum, 42161 = Arbitrum, 8453 = Base)'),
    amount: z.string().describe('Amount to withdraw in smallest unit (e.g., 1000000 for 1 USDC)'),
    tokenAddress: z.string().optional().describe('Token address to withdraw. Defaults to USDC on the selected chain.'),
  }),
  execute: async ({ userAddress, chainId, amount, tokenAddress }) => {
    try {
      // Validate chain is supported
      const supportedChain = YELLOW_SUPPORTED_CHAINS.find(c => c.chainId === chainId);
      if (!supportedChain) {
        return {
          success: false,
          error: `Chain ${chainId} not supported. Yellow Network supports: ${YELLOW_SUPPORTED_CHAINS.map(c => c.name).join(', ')}`,
        };
      }

      // Use provided token or default to USDC
      const token = tokenAddress || USDC_ADDRESSES[chainId];
      if (!token) {
        return {
          success: false,
          error: `No default USDC address for chain ${chainId}. Please provide a token address.`,
        };
      }

      // Build withdraw transaction
      const withdrawData = encodeFunctionData({
        abi: CUSTODY_ABI,
        functionName: 'withdraw',
        args: [token as `0x${string}`, BigInt(amount)],
      });

      const formattedAmount = formatAmount(amount, 6); // Assuming USDC with 6 decimals

      return {
        success: true,
        chainId,
        chainName: supportedChain.name,
        withdrawAmount: {
          raw: amount,
          formatted: formattedAmount,
          symbol: 'USDC',
        },
        transaction: {
          name: 'Withdraw from Yellow',
          description: `Withdraw ${formattedAmount} USDC from Yellow Network custody`,
          to: YELLOW_CONTRACTS.custody,
          data: withdrawData,
          value: '0',
        },
        contracts: {
          custody: YELLOW_CONTRACTS.custody,
          token,
        },
        note: 'Ensure any active state channel is properly closed before withdrawing.',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to build withdraw transaction';
      return {
        success: false,
        error: message,
      };
    }
  },
});
