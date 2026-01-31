import { z } from 'zod';
import { tool } from 'ai';
import { createPublicClient, encodeFunctionData, http } from 'viem';
import { arbitrum, mainnet, polygon, optimism, base } from 'viem/chains';
import { AAVE_POOL_ADDRESSES, AAVE_POOL_ABI, ERC20_ABI } from './aave-config';

const chains: Record<number, any> = {
  1: mainnet,
  42161: arbitrum,
  137: polygon,
  10: optimism,
  8453: base,
};

function getClient(chainId: number) {
  const chain = chains[chainId];
  if (!chain) throw new Error(`Unsupported chain ID: ${chainId}`);
  return createPublicClient({ chain, transport: http() });
}

export const getAaveUserPosition = tool({
  description:
    'Get a user\'s lending position on Aave v3. Returns total collateral, total debt, available borrows, and health factor. This is a read-only call, no gas needed.',
  parameters: z.object({
    chainId: z.number().describe('Chain ID where the Aave position is (e.g. 42161 for Arbitrum, 1 for Ethereum, 137 for Polygon)'),
    userAddress: z.string().describe('The user wallet address to check'),
  }),
  execute: async ({ chainId, userAddress }) => {
    try {
      const poolAddress = AAVE_POOL_ADDRESSES[chainId];
      if (!poolAddress) {
        return { success: false, error: `Aave v3 is not available on chain ${chainId}` };
      }

      const client = getClient(chainId);
      const result = await client.readContract({
        address: poolAddress,
        abi: AAVE_POOL_ABI,
        functionName: 'getUserAccountData',
        args: [userAddress as `0x${string}`],
      });

      const [totalCollateralBase, totalDebtBase, availableBorrowsBase, currentLiquidationThreshold, ltv, healthFactor] = result;

      // Values are in base currency (USD) with 8 decimals
      return {
        success: true,
        position: {
          totalCollateralUSD: (Number(totalCollateralBase) / 1e8).toFixed(2),
          totalDebtUSD: (Number(totalDebtBase) / 1e8).toFixed(2),
          availableBorrowsUSD: (Number(availableBorrowsBase) / 1e8).toFixed(2),
          currentLiquidationThreshold: (Number(currentLiquidationThreshold) / 100).toFixed(2) + '%',
          ltv: (Number(ltv) / 100).toFixed(2) + '%',
          healthFactor: Number(totalDebtBase) > 0
            ? (Number(healthFactor) / 1e18).toFixed(4)
            : 'N/A (no debt)',
          chainId,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch Aave position' };
    }
  },
});

export const getAaveSupplyTx = tool({
  description:
    'Build transaction data to supply (deposit) an asset into Aave v3 to earn yield. Returns an ERC20 approve transaction and a supply transaction. The user must sign both in their wallet.',
  parameters: z.object({
    chainId: z.number().describe('Chain ID where Aave pool is (e.g. 42161 for Arbitrum)'),
    asset: z.string().describe('The token contract address to supply (e.g. USDC address on Arbitrum)'),
    amount: z.string().describe('Amount to supply in the smallest unit of the token (e.g. 1000000 for 1 USDC)'),
    userAddress: z.string().describe('The user wallet address supplying the asset'),
  }),
  execute: async ({ chainId, asset, amount, userAddress }) => {
    try {
      const poolAddress = AAVE_POOL_ADDRESSES[chainId];
      if (!poolAddress) {
        return { success: false, error: `Aave v3 is not available on chain ${chainId}` };
      }

      const approveTxData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [poolAddress, BigInt(amount)],
      });

      const supplyTxData = encodeFunctionData({
        abi: AAVE_POOL_ABI,
        functionName: 'supply',
        args: [asset as `0x${string}`, BigInt(amount), userAddress as `0x${string}`, 0],
      });

      return {
        success: true,
        transactions: [
          {
            step: 'approve',
            description: 'Approve Aave Pool to spend your tokens',
            transactionRequest: {
              to: asset,
              data: approveTxData,
              chainId,
            },
          },
          {
            step: 'supply',
            description: 'Supply tokens to Aave to earn yield',
            transactionRequest: {
              to: poolAddress,
              data: supplyTxData,
              chainId,
            },
          },
        ],
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to build supply transaction' };
    }
  },
});

export const getAaveWithdrawTx = tool({
  description:
    'Build transaction data to withdraw an asset from Aave v3. Returns a withdraw transaction for the user to sign.',
  parameters: z.object({
    chainId: z.number().describe('Chain ID where Aave pool is'),
    asset: z.string().describe('The underlying token contract address to withdraw'),
    amount: z.string().describe('Amount to withdraw in smallest unit. Use max uint256 (115792089237316195423570985008687907853269984665640564039457584007913129639935) for full balance.'),
    userAddress: z.string().describe('The user wallet address withdrawing the asset'),
  }),
  execute: async ({ chainId, asset, amount, userAddress }) => {
    try {
      const poolAddress = AAVE_POOL_ADDRESSES[chainId];
      if (!poolAddress) {
        return { success: false, error: `Aave v3 is not available on chain ${chainId}` };
      }

      const withdrawTxData = encodeFunctionData({
        abi: AAVE_POOL_ABI,
        functionName: 'withdraw',
        args: [asset as `0x${string}`, BigInt(amount), userAddress as `0x${string}`],
      });

      return {
        success: true,
        transactions: [
          {
            step: 'withdraw',
            description: 'Withdraw tokens from Aave',
            transactionRequest: {
              to: poolAddress,
              data: withdrawTxData,
              chainId,
            },
          },
        ],
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to build withdraw transaction' };
    }
  },
});
