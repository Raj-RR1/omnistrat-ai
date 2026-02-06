import { z } from 'zod';
import { tool } from 'ai';
import { createPublicClient, http, encodeFunctionData, maxUint256 } from 'viem';
import { mainnet, arbitrum, base, polygon, optimism, sepolia, baseSepolia } from 'viem/chains';
import { formatTokenAmount } from '../../lib/format';
import {
  UNISWAP_V4_CONTRACTS,
  UNISWAP_V4_CHAINS,
  COMMON_TOKENS,
  COMMON_FEE_TIERS,
  FEE_TO_TICK_SPACING,
  TICK_RANGE_PRESETS,
  STATE_VIEW_ABI,
  PERMIT2_APPROVE_ABI,
  ERC20_ABI,
} from './uniswap-v4-config';

const CHAINS: Record<number, any> = {
  1: mainnet,
  42161: arbitrum,
  8453: base,
  137: polygon,
  10: optimism,
  11155111: sepolia,
  84532: baseSepolia,
};

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;
const ZERO_HOOKS = '0x0000000000000000000000000000000000000000' as const;

function isNativeETH(address: string): boolean {
  return address.toLowerCase() === ZERO_ADDRESS;
}

function getChainName(chainId: number): string {
  return UNISWAP_V4_CHAINS.find(c => c.chainId === chainId)?.name || `Chain ${chainId}`;
}

async function resolveTokenInfo(
  chainId: number,
  address: string,
  client?: any,
): Promise<{ symbol: string; decimals: number }> {
  if (isNativeETH(address)) {
    return { symbol: 'ETH', decimals: 18 };
  }

  // Check curated list first
  const tokens = COMMON_TOKENS[chainId];
  if (tokens) {
    const found = Object.values(tokens).find(
      t => t.address.toLowerCase() === address.toLowerCase(),
    );
    if (found) return { symbol: found.symbol, decimals: found.decimals };
  }

  // Fallback: read from contract
  if (client) {
    try {
      const [symbol, decimals] = await Promise.all([
        client.readContract({ address: address as `0x${string}`, abi: ERC20_ABI, functionName: 'symbol' }),
        client.readContract({ address: address as `0x${string}`, abi: ERC20_ABI, functionName: 'decimals' }),
      ]);
      return { symbol: symbol as string, decimals: Number(decimals) };
    } catch {
      return { symbol: 'UNKNOWN', decimals: 18 };
    }
  }

  return { symbol: 'UNKNOWN', decimals: 18 };
}

export const getUniswapV4Info = tool({
  description:
    'Get information about Uniswap v4 and its features. Use when the user asks about Uniswap v4, liquidity provision, LP positions, hooks, or v4 pools.',
  parameters: z.object({}),
  execute: async () => {
    return {
      success: true,
      name: 'Uniswap v4',
      description:
        'Next-generation AMM with singleton architecture, hooks, and native ETH support. Provides concentrated liquidity pools for capital-efficient market making.',
      features: [
        'Singleton PoolManager — all pools in one contract, reducing gas for multi-hop operations',
        'Hooks — customizable pool logic (dynamic fees, TWAP oracles, limit orders)',
        'Native ETH support — no WETH wrapping needed for liquidity provision',
        'Flash accounting — net-zero settlement reduces gas costs',
        'Concentrated liquidity — choose your price range for higher capital efficiency',
        'ERC-721 position NFTs — each LP position is a unique token',
      ],
      lpFlow: [
        '1. Choose token pair, fee tier, and price range',
        '2. Approve tokens via Permit2 (one-time)',
        '3. Mint position via PositionManager',
        '4. Fees auto-accumulate — collect by modifying position',
        '5. Remove liquidity anytime (fees auto-collected)',
      ],
      feeTiers: COMMON_FEE_TIERS.map(t => t.label),
      supportedChains: UNISWAP_V4_CHAINS,
      links: {
        docs: 'https://docs.uniswap.org/contracts/v4/overview',
        app: 'https://app.uniswap.org',
      },
    };
  },
});

export const buildUniswapV4MintPositionTx = tool({
  description:
    'Build transactions to add liquidity to a Uniswap v4 pool by minting a new LP position. Returns approve + mint transactions. Use when the user wants to "add liquidity", "provide liquidity", "LP on Uniswap v4", or "mint a position". The AI should determine token addresses from context and pass amounts in smallest units.',
  parameters: z.object({
    userAddress: z.string().describe('The user wallet address'),
    chainId: z.number().describe('Chain ID (1=Ethereum, 42161=Arbitrum, 8453=Base, 137=Polygon, 10=Optimism, 11155111=Sepolia, 84532=Base Sepolia)'),
    token0: z.string().describe('First token address. Use 0x0000000000000000000000000000000000000000 for native ETH.'),
    token1: z.string().describe('Second token address'),
    amount0Desired: z.string().describe('Desired amount of token0 in smallest unit (e.g., 1000000000000000000 for 1 ETH)'),
    amount1Desired: z.string().describe('Desired amount of token1 in smallest unit (e.g., 1000000 for 1 USDC)'),
    fee: z.number().optional().describe('Pool fee tier in hundredths of a bip (default 3000 = 0.3%). Common: 500 (0.05%), 3000 (0.3%), 10000 (1%)'),
    rangeType: z.enum(['full', 'medium', 'narrow']).optional().describe('Price range: "full" (entire range), "medium" (+-500 ticks, default), "narrow" (+-100 ticks, more concentrated)'),
  }),
  execute: async ({ userAddress, chainId, token0, token1, amount0Desired, amount1Desired, fee, rangeType }) => {
    try {
      const contracts = UNISWAP_V4_CONTRACTS[chainId];
      if (!contracts) {
        return {
          success: false,
          error: `Chain ${chainId} not supported for Uniswap v4. Supported: ${UNISWAP_V4_CHAINS.map(c => `${c.name} (${c.chainId})`).join(', ')}`,
        };
      }

      const chain = CHAINS[chainId];
      if (!chain) {
        return { success: false, error: `Chain config not found for ${chainId}` };
      }

      const client = createPublicClient({ chain, transport: http() });

      // Resolve token info
      const [token0Info, token1Info] = await Promise.all([
        resolveTokenInfo(chainId, token0, client),
        resolveTokenInfo(chainId, token1, client),
      ]);

      // Sort currencies: lower address = currency0 (v4 convention)
      let currency0Addr = token0.toLowerCase() as `0x${string}`;
      let currency1Addr = token1.toLowerCase() as `0x${string}`;
      let amt0 = amount0Desired;
      let amt1 = amount1Desired;
      let info0 = token0Info;
      let info1 = token1Info;

      if (currency0Addr > currency1Addr) {
        [currency0Addr, currency1Addr] = [currency1Addr, currency0Addr];
        [amt0, amt1] = [amt1, amt0];
        [info0, info1] = [info1, info0];
      }

      const poolFee = fee || 3000;
      const tickSpacing = FEE_TO_TICK_SPACING[poolFee] || 60;

      // Import SDK classes dynamically to avoid top-level import issues
      const { Pool, Position, V4PositionManager } = await import('@uniswap/v4-sdk');
      const { Token, Percent, Ether } = await import('@uniswap/sdk-core');
      const { nearestUsableTick, TickMath } = await import('@uniswap/v3-sdk');

      // Fetch pool state from StateView
      const poolId = Pool.getPoolId(
        isNativeETH(currency0Addr) ? Ether.onChain(chainId) : new Token(chainId, currency0Addr, info0.decimals, info0.symbol),
        new Token(chainId, currency1Addr, info1.decimals, info1.symbol),
        poolFee,
        tickSpacing,
        ZERO_HOOKS,
      );

      let sqrtPriceX96: bigint;
      let currentTick: number;
      let currentLiquidity: bigint;

      try {
        const [slot0Result, liquidityResult] = await Promise.all([
          client.readContract({
            address: contracts.stateView,
            abi: STATE_VIEW_ABI,
            functionName: 'getSlot0',
            args: [poolId as `0x${string}`],
          }),
          client.readContract({
            address: contracts.stateView,
            abi: STATE_VIEW_ABI,
            functionName: 'getLiquidity',
            args: [poolId as `0x${string}`],
          }),
        ]);

        const slot0 = slot0Result as [bigint, number, number, number];
        sqrtPriceX96 = slot0[0];
        currentTick = Number(slot0[1]);
        currentLiquidity = liquidityResult as bigint;

        if (sqrtPriceX96 === BigInt(0)) {
          return {
            success: false,
            error: `Pool ${info0.symbol}/${info1.symbol} with fee ${poolFee} does not exist on ${getChainName(chainId)}. Try a different fee tier (500, 3000, or 10000).`,
          };
        }
      } catch {
        return {
          success: false,
          error: `Could not fetch pool state for ${info0.symbol}/${info1.symbol} on ${getChainName(chainId)}. The pool may not exist with fee tier ${poolFee}. Try creating the pool first or use a different fee tier.`,
        };
      }

      // Create SDK Pool object
      const sdkToken0 = isNativeETH(currency0Addr)
        ? Ether.onChain(chainId)
        : new Token(chainId, currency0Addr, info0.decimals, info0.symbol);
      const sdkToken1 = new Token(chainId, currency1Addr, info1.decimals, info1.symbol);

      const pool = new Pool(
        sdkToken0,
        sdkToken1,
        poolFee,
        tickSpacing,
        ZERO_HOOKS,
        sqrtPriceX96.toString(),
        currentLiquidity.toString(),
        currentTick,
      );

      // Calculate tick range
      const rangeOffset = TICK_RANGE_PRESETS[rangeType || 'medium'];
      const tickLower = nearestUsableTick(currentTick - rangeOffset, tickSpacing);
      const tickUpper = nearestUsableTick(currentTick + rangeOffset, tickSpacing);

      // Create Position from desired amounts
      const position = Position.fromAmounts({
        pool,
        tickLower,
        tickUpper,
        amount0: amt0,
        amount1: amt1,
        useFullPrecision: true,
      });

      if (position.liquidity.toString() === '0') {
        return {
          success: false,
          error: 'The specified amounts result in zero liquidity. Try increasing the amounts or widening the price range.',
        };
      }

      // Build calldata via SDK
      const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
      const mintOptions: any = {
        recipient: userAddress,
        slippageTolerance: new Percent(50, 10000), // 0.5%
        deadline,
      };

      // Use native ETH if token0 is ETH
      if (isNativeETH(currency0Addr)) {
        mintOptions.useNative = Ether.onChain(chainId);
      }

      const { calldata, value } = V4PositionManager.addCallParameters(position, mintOptions);

      // Build transactions array
      const transactions: Array<{ step: number; name: string; description: string; to: string; data: string; value: string; chainId?: number }> = [];
      let step = 1;

      // Approve ERC20 tokens to Permit2 (skip for native ETH)
      const tokensToApprove: Array<{ address: `0x${string}`; symbol: string }> = [];
      if (!isNativeETH(currency0Addr)) {
        tokensToApprove.push({ address: currency0Addr, symbol: info0.symbol });
      }
      tokensToApprove.push({ address: currency1Addr, symbol: info1.symbol });

      for (const tkn of tokensToApprove) {
        const approveData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [contracts.permit2, maxUint256],
        });
        transactions.push({
          step: step++,
          name: `Approve ${tkn.symbol} for Permit2`,
          description: `Allow Permit2 to spend your ${tkn.symbol} (one-time approval)`,
          to: tkn.address,
          data: approveData,
          value: '0',
          chainId,
        });
      }

      // Permit2 approve tokens to PositionManager
      const permit2Expiration = Math.floor(Date.now() / 1000) + 86400; // 24h
      for (const tkn of tokensToApprove) {
        const permit2Data = encodeFunctionData({
          abi: PERMIT2_APPROVE_ABI,
          functionName: 'approve',
          args: [tkn.address, contracts.positionManager, BigInt('0xffffffffffffffffffffffffffffffffffffffff'), permit2Expiration],
        });
        transactions.push({
          step: step++,
          name: `Permit2: Approve ${tkn.symbol} for PositionManager`,
          description: `Grant PositionManager permission to use your ${tkn.symbol} via Permit2`,
          to: contracts.permit2,
          data: permit2Data,
          value: '0',
          chainId,
        });
      }

      // Mint position via PositionManager
      const ethValue = BigInt(value).toString();
      transactions.push({
        step: step++,
        name: 'Mint LP Position',
        description: `Add liquidity: ${formatTokenAmount(position.amount0.quotient.toString(), info0.decimals)} ${info0.symbol} + ${formatTokenAmount(position.amount1.quotient.toString(), info1.decimals)} ${info1.symbol} to ${info0.symbol}/${info1.symbol} pool`,
        to: contracts.positionManager,
        data: calldata,
        value: ethValue,
        chainId,
      });

      const feeLabel = COMMON_FEE_TIERS.find(t => t.fee === poolFee)?.label || `${poolFee / 10000}%`;

      return {
        success: true,
        type: 'uniswap_v4_mint',
        chainId,
        chainName: getChainName(chainId),
        pool: {
          token0: { address: currency0Addr, symbol: info0.symbol, decimals: info0.decimals },
          token1: { address: currency1Addr, symbol: info1.symbol, decimals: info1.decimals },
          fee: poolFee,
          feeLabel,
          tickSpacing,
        },
        position: {
          tickLower,
          tickUpper,
          rangeType: rangeType || 'medium',
          liquidity: position.liquidity.toString(),
          amount0: {
            raw: position.amount0.quotient.toString(),
            formatted: formatTokenAmount(position.amount0.quotient.toString(), info0.decimals),
            symbol: info0.symbol,
          },
          amount1: {
            raw: position.amount1.quotient.toString(),
            formatted: formatTokenAmount(position.amount1.quotient.toString(), info1.decimals),
            symbol: info1.symbol,
          },
        },
        transactions,
        note: `This will create a concentrated liquidity position in the ${info0.symbol}/${info1.symbol} ${feeLabel} pool. You will receive an ERC-721 NFT representing your position. Fees auto-accumulate and are collected when you modify or remove the position.`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to build mint position transaction';
      return { success: false, error: message };
    }
  },
});

export const buildUniswapV4RemoveLiquidityTx = tool({
  description:
    'Build transactions to remove liquidity from a Uniswap v4 position. Fees are automatically collected during removal. Use when the user wants to "remove liquidity", "withdraw from LP", "close LP position", or "burn position".',
  parameters: z.object({
    userAddress: z.string().describe('The user wallet address'),
    chainId: z.number().describe('Chain ID'),
    tokenId: z.number().describe('The position NFT token ID'),
    token0: z.string().describe('Token0 address of the pool'),
    token1: z.string().describe('Token1 address of the pool'),
    fee: z.number().optional().describe('Pool fee tier (default 3000)'),
    liquidityPercentage: z.number().min(1).max(100).describe('Percentage of liquidity to remove (1-100)'),
    tickLower: z.number().describe('Lower tick of the position'),
    tickUpper: z.number().describe('Upper tick of the position'),
  }),
  execute: async ({ chainId, tokenId, token0, token1, fee, liquidityPercentage, tickLower, tickUpper }) => {
    try {
      const contracts = UNISWAP_V4_CONTRACTS[chainId];
      if (!contracts) {
        return {
          success: false,
          error: `Chain ${chainId} not supported for Uniswap v4.`,
        };
      }

      const chain = CHAINS[chainId];
      if (!chain) {
        return { success: false, error: `Chain config not found for ${chainId}` };
      }

      const client = createPublicClient({ chain, transport: http() });

      const [token0Info, token1Info] = await Promise.all([
        resolveTokenInfo(chainId, token0, client),
        resolveTokenInfo(chainId, token1, client),
      ]);

      // Sort currencies
      let currency0Addr = token0.toLowerCase() as `0x${string}`;
      let currency1Addr = token1.toLowerCase() as `0x${string}`;
      let info0 = token0Info;
      let info1 = token1Info;

      if (currency0Addr > currency1Addr) {
        [currency0Addr, currency1Addr] = [currency1Addr, currency0Addr];
        [info0, info1] = [info1, info0];
      }

      const poolFee = fee || 3000;
      const tickSpacing = FEE_TO_TICK_SPACING[poolFee] || 60;

      const { Pool, Position, V4PositionManager } = await import('@uniswap/v4-sdk');
      const { Token, Percent, Ether } = await import('@uniswap/sdk-core');

      // Fetch pool state
      const sdkToken0 = isNativeETH(currency0Addr)
        ? Ether.onChain(chainId)
        : new Token(chainId, currency0Addr, info0.decimals, info0.symbol);
      const sdkToken1 = new Token(chainId, currency1Addr, info1.decimals, info1.symbol);

      const poolId = Pool.getPoolId(sdkToken0, sdkToken1, poolFee, tickSpacing, ZERO_HOOKS);

      const [slot0Result, liquidityResult] = await Promise.all([
        client.readContract({
          address: contracts.stateView,
          abi: STATE_VIEW_ABI,
          functionName: 'getSlot0',
          args: [poolId as `0x${string}`],
        }),
        client.readContract({
          address: contracts.stateView,
          abi: STATE_VIEW_ABI,
          functionName: 'getLiquidity',
          args: [poolId as `0x${string}`],
        }),
      ]);

      const slot0 = slot0Result as [bigint, number, number, number];
      const sqrtPriceX96 = slot0[0];
      const currentTick = Number(slot0[1]);
      const currentLiquidity = liquidityResult as bigint;

      const pool = new Pool(
        sdkToken0,
        sdkToken1,
        poolFee,
        tickSpacing,
        ZERO_HOOKS,
        sqrtPriceX96.toString(),
        currentLiquidity.toString(),
        currentTick,
      );

      // Create a position with a nominal amount (SDK needs it for encoding)
      // The actual liquidity amount comes from the on-chain position
      const position = new Position({
        pool,
        tickLower,
        tickUpper,
        liquidity: 1, // Placeholder — SDK uses liquidityPercentage to compute actual removal
      });

      const deadline = Math.floor(Date.now() / 1000) + 1800;

      const { calldata, value } = V4PositionManager.removeCallParameters(position, {
        tokenId,
        slippageTolerance: new Percent(50, 10000),
        deadline,
        liquidityPercentage: new Percent(liquidityPercentage, 100),
      });

      const transactions = [
        {
          step: 1,
          name: 'Remove Liquidity',
          description: `Remove ${liquidityPercentage}% of liquidity from ${info0.symbol}/${info1.symbol} position #${tokenId}. Accumulated fees will be auto-collected.`,
          to: contracts.positionManager,
          data: calldata,
          value: BigInt(value).toString(),
          chainId,
        },
      ];

      return {
        success: true,
        type: 'uniswap_v4_remove',
        chainId,
        chainName: getChainName(chainId),
        tokenId,
        liquidityPercentage,
        pool: {
          token0: { symbol: info0.symbol },
          token1: { symbol: info1.symbol },
          fee: poolFee,
        },
        transactions,
        note: `Removing ${liquidityPercentage}% of your position. Accumulated swap fees will be automatically collected during this operation.`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to build remove liquidity transaction';
      return { success: false, error: message };
    }
  },
});
