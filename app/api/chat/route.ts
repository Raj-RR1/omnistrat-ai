import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { getSwapQuote, getSwapRoutes, getTokenBalances } from '../tools/lifi-tool';
import { getAaveUserPosition, getAaveSupplyTx, getAaveWithdrawTx } from '../tools/aave-tool';
import { resolveEnsName, lookupEnsName, getEnsTextRecord, getOmniStratPreferences, getEnsNameForAddress, fetchEnsPreferences } from '../tools/ens-tool';
import { getYellowNetworkInfo, getYellowSessionStatus, buildYellowDepositTx, buildYellowWithdrawTx } from '../tools/yellow-tool';

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

const systemPrompt = `You are OmniStrat AI, a DeFi strategy assistant that helps users execute cross-chain token swaps, bridges, and lending strategies.

You have access to the following tools:

SWAP/BRIDGE TOOLS:
- getSwapQuote: Get a quote for swapping or bridging tokens across chains.
- getSwapRoutes: Get multiple route options for a swap.
- getTokenBalances: Get all token balances across multiple chains for a wallet. Use when user asks "what do I have", "my balances", "show my tokens".

AAVE LENDING TOOLS:
- getAaveUserPosition: Check a user's Aave v3 lending position (collateral, debt, health factor). Read-only, no gas needed.
- getAaveSupplyTx: Build transactions to supply (deposit) an asset into Aave v3 to earn yield. Returns approve + supply transactions.
- getAaveWithdrawTx: Build a transaction to withdraw an asset from Aave v3.

ENS TOOLS:
- resolveEnsName: Resolve an ENS name (like vitalik.eth) to an Ethereum address. ALWAYS use this when a user provides a .eth name instead of an address.
- lookupEnsName: Look up the ENS name for an address (reverse lookup). Use to display human-readable names.
- getEnsTextRecord: Get a text record from an ENS name (email, avatar, url, twitter, or custom keys).
- getOmniStratPreferences: Get the user's DeFi preferences from their ENS profile (slippage, preferred chains, risk profile). Use this to personalize recommendations.

YELLOW NETWORK TOOLS (State Channels for Instant Operations):
- getYellowNetworkInfo: Get information about Yellow Network and state channels. Use when user asks about instant transactions, gas-free operations, or Yellow Network.
- getYellowSessionStatus: Check if a Yellow session is active and get balance. Use when user asks "what's my Yellow balance" or "is my session active".
- buildYellowDepositTx: Build transactions to deposit funds into Yellow Network. Use when user wants to "open a Yellow session" or "enable instant transactions". Supported chains: Ethereum, Arbitrum, Base.
- buildYellowWithdrawTx: Build a transaction to withdraw from Yellow Network. Use when user wants to "close Yellow session" or "withdraw from Yellow".

MULTI-STEP STRATEGIES:
You can combine tools for complex strategies. For example:
- "Bridge USDC from Ethereum and deposit into Aave on Arbitrum" → use getSwapQuote first, then getAaveSupplyTx.
- "Withdraw from Aave and swap to ETH" → use getAaveWithdrawTx first, then getSwapQuote.

RULES:
1. CRITICAL: After ANY tool returns successfully, your text response MUST be extremely brief (one short sentence max). DO NOT list steps, amounts, transaction details, or descriptions — the UI already renders all of that in interactive cards. Good examples: "Here's your quote.", "Here's your Aave position.", "I've prepared the transactions for you." Bad examples: listing approve/supply steps, repeating amounts, describing what each transaction does.
2. If a tool returns an error, explain what went wrong and suggest how to fix it.
3. Ask for any missing information before calling a tool.

Common chain IDs: Ethereum=1, Arbitrum=42161, Polygon=137, Optimism=10, Base=8453.

Common token addresses:
- Native ETH (all EVM chains): 0x0000000000000000000000000000000000000000
- USDC on Ethereum: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
- USDC on Arbitrum: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
- USDC on Polygon: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
- USDC on Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
- USDT on Ethereum: 0xdAC17F958D2ee523a2206206994597C13D831ec7
- WETH on Arbitrum: 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1

Token amounts must be in the smallest unit (e.g. 1 USDC = 1000000, 0.01 ETH = 10000000000000000).

Be concise and helpful. If the user hasn't connected their wallet yet, remind them to connect before executing transactions.`;

export const dynamic = 'force-dynamic';

// Build personalized context from ENS preferences
function buildPreferencesContext(ensName: string | null, prefs: { slippage: string | null; chains: string | null; risk: string | null; gasLimit: string | null } | null): string {
  if (!ensName || !prefs) return '';

  const parts: string[] = [];
  parts.push(`\nThe user has ENS name: ${ensName}`);

  const hasAnyPref = prefs.slippage || prefs.chains || prefs.risk || prefs.gasLimit;
  if (hasAnyPref) {
    parts.push('Their DeFi preferences from ENS profile:');
    if (prefs.slippage) parts.push(`- Preferred slippage: ${prefs.slippage}%`);
    if (prefs.chains) parts.push(`- Preferred chains: ${prefs.chains}`);
    if (prefs.risk) parts.push(`- Risk profile: ${prefs.risk}`);
    if (prefs.gasLimit) parts.push(`- Gas preference: ${prefs.gasLimit}`);
    parts.push('Use these preferences to personalize your recommendations and default values.');
  }

  return parts.join('\n');
}

export async function POST(req: Request) {
  const { messages, walletAddress } = await req.json();

  let walletContext = '';
  let ensContext = '';

  if (walletAddress) {
    walletContext = `\n\nThe user's connected wallet address is: ${walletAddress}. Use this address automatically when calling tools — do not ask the user for their address.`;

    // Try to fetch ENS name and preferences for connected wallet
    try {
      const ensName = await getEnsNameForAddress(walletAddress);
      if (ensName) {
        const prefs = await fetchEnsPreferences(ensName);
        ensContext = buildPreferencesContext(ensName, prefs);
      }
    } catch (error) {
      // Silently ignore ENS lookup failures but log for debugging
      console.error('Failed to fetch ENS name and preferences:', error);
    }
  } else {
    walletContext = '\n\nThe user has not connected their wallet yet. Remind them to connect before executing swaps.';
  }

  const result = await streamText({
    model: getModel(),
    system: systemPrompt + walletContext + ensContext,
    messages,
    tools: {
      getSwapQuote,
      getSwapRoutes,
      getTokenBalances,
      getAaveUserPosition,
      getAaveSupplyTx,
      getAaveWithdrawTx,
      resolveEnsName,
      lookupEnsName,
      getEnsTextRecord,
      getOmniStratPreferences,
      getYellowNetworkInfo,
      getYellowSessionStatus,
      buildYellowDepositTx,
      buildYellowWithdrawTx,
    },
    maxSteps: 5,
  });

  return result.toDataStreamResponse();
}
