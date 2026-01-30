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
        integrator: 'OmniStratAI',
        fee: 0.003,
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
          integrator: 'OmniStratAI',
          fee: 0.003,
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
