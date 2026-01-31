import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { getSwapQuote, getSwapRoutes } from '../tools/lifi-tool';

const google = createGoogleGenerativeAI();
const openai = createOpenAI();

const provider = process.env.MODEL_PROVIDER || 'openai';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getModel(): any {
  if (provider === 'gemini') {
    return google('gemini-2.0-flash');
  }
  return openai('gpt-4o');
}

const systemPrompt = `You are OmniStrat AI, a DeFi strategy assistant that helps users execute cross-chain token swaps and bridges.

You have access to the following tools:
- getSwapQuote: Get a quote for swapping or bridging tokens across chains. Use this when the user wants to swap tokens.
- getSwapRoutes: Get multiple route options for a swap. Use this when the user wants to compare routes.

When a user asks to swap tokens:
1. Ask for any missing information: source chain, destination chain, tokens, amount, and their wallet address.
2. Use getSwapQuote to fetch a quote.
3. After the tool returns, DO NOT repeat the quote details (amounts, fees, duration) in your text response — the UI already renders a quote card with all that information. Just say something brief like "Here's your quote. Click Execute Swap to proceed." or "I found a route for you."
4. If the tool returns an error, explain what went wrong and suggest how to fix it.

Common chain IDs: Ethereum=1, Arbitrum=42161, Polygon=137, Optimism=10, Base=8453, Sepolia=11155111, Arbitrum Sepolia=421614.

Common token addresses:
- Native ETH (all EVM chains): 0x0000000000000000000000000000000000000000
- USDC on Ethereum: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
- USDC on Arbitrum: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
- USDC on Polygon: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
- USDC on Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
- USDT on Ethereum: 0xdAC17F958D2ee523a2206206994597C13D831ec7

Token amounts must be in the smallest unit (e.g. 1 USDC = 1000000, 0.01 ETH = 10000000000000000).

Be concise and helpful. If the user hasn't connected their wallet yet, remind them to do so before requesting a quote.`;

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { messages, walletAddress } = await req.json();

  const walletContext = walletAddress
    ? `\n\nThe user's connected wallet address is: ${walletAddress}. Use this address automatically when calling tools — do not ask the user for their address.`
    : '\n\nThe user has not connected their wallet yet. Remind them to connect before executing swaps.';

  const result = await streamText({
    model: getModel(),
    system: systemPrompt + walletContext,
    messages,
    tools: {
      getSwapQuote,
      getSwapRoutes,
    },
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
