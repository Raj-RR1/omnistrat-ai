import { z } from 'zod';
import { tool } from 'ai';
import { getQuote, getRoutes } from '@lifi/sdk';
import './lifi-config';

export const getSwapQuote = tool({
  description:
    'Get a quote for a cross-chain or same-chain token swap using LI.FI. Returns estimated output amount, fees, route details, and transaction data. Use this when the user wants to swap or bridge tokens.',
  parameters: z.object({
    fromChain: z.number().describe('Source chain ID (e.g. 1 for Ethereum, 42161 for Arbitrum, 137 for Polygon, 10 for Optimism, 8453 for Base, 11155111 for Sepolia)'),
    toChain: z.number().describe('Destination chain ID'),
    fromToken: z.string().describe('Source token contract address. Use 0x0000000000000000000000000000000000000000 for native ETH'),
    toToken: z.string().describe('Destination token contract address. Use 0x0000000000000000000000000000000000000000 for native ETH'),
    fromAmount: z.string().describe('Amount to swap in the smallest unit of the token (e.g. 1000000 for 1 USDC with 6 decimals, or 10000000000000000 for 0.01 ETH with 18 decimals)'),
    fromAddress: z.string().describe('The user wallet address sending the tokens'),
    fromAmountForGas: z.string().optional().describe('Optional: amount in smallest unit to convert to native gas on the destination chain (gas subsidy/refuel)'),
  }),
  execute: async ({ fromChain, toChain, fromToken, toToken, fromAmount, fromAddress, fromAmountForGas }) => {
    try {
      const quote = await getQuote({
        fromChain,
        toChain,
        fromToken,
        toToken,
        fromAmount,
        fromAddress,
        fromAmountForGas,
      });

      return {
        success: true,
        estimate: {
          fromAmount: quote.action.fromAmount,
          fromToken: quote.action.fromToken.symbol,
          fromChain: quote.action.fromChainId,
          toAmount: quote.estimate.toAmount,
          toAmountMin: quote.estimate.toAmountMin,
          toToken: quote.action.toToken.symbol,
          toChain: quote.action.toChainId,
          executionDuration: quote.estimate.executionDuration,
          gasCosts: quote.estimate.gasCosts,
          feeCosts: quote.estimate.feeCosts,
        },
        transactionRequest: quote.transactionRequest,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get quote',
      };
    }
  },
});

export const getSwapRoutes = tool({
  description:
    'Get multiple route options for a cross-chain or same-chain token swap. Returns an array of routes sorted by best price. Use this when the user wants to compare different swap routes.',
  parameters: z.object({
    fromChainId: z.number().describe('Source chain ID'),
    toChainId: z.number().describe('Destination chain ID'),
    fromTokenAddress: z.string().describe('Source token contract address'),
    toTokenAddress: z.string().describe('Destination token contract address'),
    fromAmount: z.string().describe('Amount in smallest unit of the token'),
    fromAddress: z.string().optional().describe('User wallet address'),
    fromAmountForGas: z.string().optional().describe('Optional: amount for gas subsidy on destination chain'),
  }),
  execute: async ({ fromChainId, toChainId, fromTokenAddress, toTokenAddress, fromAmount, fromAddress, fromAmountForGas }) => {
    try {
      const result = await getRoutes({
        fromChainId,
        toChainId,
        fromTokenAddress,
        toTokenAddress,
        fromAmount,
        fromAddress,
        fromAmountForGas,
        options: {
          slippage: 0.005,
          order: 'CHEAPEST',
        },
      });

      return {
        success: true,
        routes: result.routes.slice(0, 3).map((route) => ({
          id: route.id,
          fromAmount: route.fromAmount,
          toAmount: route.toAmount,
          toAmountMin: route.toAmountMin,
          steps: route.steps.map((step) => ({
            type: step.type,
            tool: step.tool,
            fromChain: step.action.fromChainId,
            toChain: step.action.toChainId,
            fromToken: step.action.fromToken.symbol,
            toToken: step.action.toToken.symbol,
          })),
          gasCostUSD: route.gasCostUSD,
          executionDuration: route.steps.reduce(
            (sum, step) => sum + (step.estimate?.executionDuration || 0),
            0
          ),
        })),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get routes',
      };
    }
  },
});

// Common tokens to check across chains
const TOKENS_TO_CHECK: { chainId: number; address: string; symbol: string; decimals: number }[] = [
  // Ethereum
  { chainId: 1, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6 },
  { chainId: 1, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6 },
  { chainId: 1, address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', decimals: 18 },
  { chainId: 1, address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', decimals: 18 },
  // Arbitrum
  { chainId: 42161, address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', decimals: 6 },
  { chainId: 42161, address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', decimals: 6 },
  { chainId: 42161, address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', decimals: 18 },
  // Polygon
  { chainId: 137, address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC', decimals: 6 },
  { chainId: 137, address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', decimals: 6 },
  // Base
  { chainId: 8453, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6 },
  // Optimism
  { chainId: 10, address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', decimals: 6 },
  { chainId: 10, address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', decimals: 6 },
];

const ERC20_BALANCE_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const getTokenBalances = tool({
  description:
    'Get token balances for a wallet address across multiple chains. Returns native ETH/MATIC and common tokens (USDC, USDT, DAI, WETH) with non-zero balances. Use this when the user asks "what tokens do I have", "show my balances", or "what\'s in my wallet".',
  parameters: z.object({
    walletAddress: z.string().describe('The wallet address to check balances for'),
    chainIds: z.array(z.number()).optional().describe('Optional: specific chain IDs to check. Defaults to Ethereum, Arbitrum, Polygon, Optimism, Base'),
  }),
  execute: async ({ walletAddress, chainIds }) => {
    try {
      const { createPublicClient, http } = await import('viem');
      const { mainnet, arbitrum, polygon, optimism, base } = await import('viem/chains');

      const chainsConfig: Record<number, { chain: any; nativeSymbol: string }> = {
        1: { chain: mainnet, nativeSymbol: 'ETH' },
        42161: { chain: arbitrum, nativeSymbol: 'ETH' },
        137: { chain: polygon, nativeSymbol: 'MATIC' },
        10: { chain: optimism, nativeSymbol: 'ETH' },
        8453: { chain: base, nativeSymbol: 'ETH' },
      };

      const targetChains = chainIds || [1, 42161, 137, 10, 8453];
      const allBalances: {
        symbol: string;
        chainId: number;
        chainName: string;
        address: string;
        amount: string;
        amountFormatted: string;
        decimals: number;
      }[] = [];

      // Check balances for each chain using multicall for efficiency
      for (const chainId of targetChains) {
        const config = chainsConfig[chainId];
        if (!config) continue;

        const client = createPublicClient({
          chain: config.chain,
          transport: http(),
          batch: { multicall: true },
        });

        const tokensOnChain = TOKENS_TO_CHECK.filter((t) => t.chainId === chainId);

        try {
          // Batch all calls: native balance + all ERC20 balances
          const [nativeBalance, ...erc20Balances] = await Promise.all([
            client.getBalance({ address: walletAddress as `0x${string}` }),
            ...tokensOnChain.map((token) =>
              client.readContract({
                address: token.address as `0x${string}`,
                abi: ERC20_BALANCE_ABI,
                functionName: 'balanceOf',
                args: [walletAddress as `0x${string}`],
              }).catch(() => BigInt(0))
            ),
          ]);

          // Add native balance if non-zero
          if (nativeBalance > BigInt(0)) {
            allBalances.push({
              symbol: config.nativeSymbol,
              chainId,
              chainName: getChainName(chainId),
              address: '0x0000000000000000000000000000000000000000',
              amount: nativeBalance.toString(),
              amountFormatted: formatTokenAmount(nativeBalance.toString(), 18),
              decimals: 18,
            });
          }

          // Add ERC20 balances if non-zero
          tokensOnChain.forEach((token, idx) => {
            const balance = erc20Balances[idx];
            if (balance > BigInt(0)) {
              allBalances.push({
                symbol: token.symbol,
                chainId,
                chainName: getChainName(chainId),
                address: token.address,
                amount: balance.toString(),
                amountFormatted: formatTokenAmount(balance.toString(), token.decimals),
                decimals: token.decimals,
              });
            }
          });
        } catch (e) {
          // Skip chain if RPC fails entirely
        }
      }

      // Sort by amount (native tokens first, then by symbol)
      allBalances.sort((a, b) => {
        if (a.address === '0x0000000000000000000000000000000000000000') return -1;
        if (b.address === '0x0000000000000000000000000000000000000000') return 1;
        return a.symbol.localeCompare(b.symbol);
      });

      return {
        success: true,
        walletAddress,
        tokenCount: allBalances.length,
        balances: allBalances,
        note: 'Showing native tokens and common ERC20s (USDC, USDT, DAI, WETH). Other tokens may exist.',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to fetch token balances',
      };
    }
  },
});

function getChainName(chainId: number): string {
  const names: Record<number, string> = {
    1: 'Ethereum',
    42161: 'Arbitrum',
    137: 'Polygon',
    10: 'Optimism',
    8453: 'Base',
  };
  return names[chainId] || `Chain ${chainId}`;
}

function formatTokenAmount(amount: string, decimals: number): string {
  const value = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const integerPart = value / divisor;
  const fractionalPart = value % divisor;
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 6);
  return `${integerPart}.${fractionalStr}`.replace(/\.?0+$/, '') || '0';
}
