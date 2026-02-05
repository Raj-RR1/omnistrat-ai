# OmniStrat AI

AI-powered DeFi strategy assistant that unifies cross-chain operations through natural language. Ask it to swap tokens, bridge USDC, supply to lending protocols, or manage state channels — all from a single chat interface.

Built for [Hack Money 2026](https://ethglobal.com/events/hackmoney2026) by ETHGlobal.

## Features

- **Natural Language DeFi** — Describe what you want ("swap 100 USDC to ETH on Arbitrum") and the AI builds and presents the transactions for you to approve
- **Cross-Chain Swaps & Bridges** — Token swaps and bridges across 10+ chains via LI.FI with route comparison and gas estimation
- **Unified USDC Balance** — View and manage a single USDC balance across all chains using Circle Gateway
- **Native USDC Bridging** — Burn-and-mint USDC transfers via Circle CCTP v2 — no wrapped tokens
- **Aave v3 Lending** — Supply and withdraw assets on Aave v3 with position tracking across chains
- **ENS Identity** — Resolve ENS names, read on-chain profiles, and store DeFi preferences as ENS text records
- **Yellow Network State Channels** — Instant, gas-free off-chain operations with on-chain settlement
- **Multi-Model AI** — Supports OpenAI GPT-4o and Google Gemini 2.0 Flash (configurable via env var)

## Integrated Protocols

| Protocol | What it does | Tool |
|----------|-------------|------|
| [LI.FI](https://li.fi) | Cross-chain swap & bridge aggregation | `lifi-tool.ts` |
| [Aave v3](https://aave.com) | Lending — supply & withdraw | `aave-tool.ts` |
| [Aave v3](https://aave.com) | Lending — Supply & Withdraw | `aave-tool.ts` |
| [Circle CCTP v2](https://developers.circle.com/stablecoins/cctp-getting-started) | Native USDC burn-and-mint bridging | `arc-tool.ts` |
| [ENS](https://ens.domains) | Name resolution & DeFi preferences | `ens-tool.ts` |
| [Yellow Network](https://yellow.org) | State channels for instant operations | `yellow-tool.ts` |

## Architecture

```
app/
├── page.tsx                    # Chat UI + transaction execution
├── layout.tsx                  # Root layout
├── providers.tsx               # wagmi + React Query providers
├── lib/
│   └── format.ts               # Token amount formatting (BigInt-based)
├── components/
│   ├── ConnectWallet.tsx        # Wallet connection
│   └── YellowSessionCard.tsx   # Yellow Network session UI
└── api/
    ├── chat/route.ts            # Streaming AI endpoint (Vercel AI SDK)
    └── tools/
        ├── lifi-tool.ts         # LI.FI swap/bridge
        ├── lifi-config.ts
        ├── aave-tool.ts         # Aave v3 lending
        ├── aave-config.ts
        ├── arc-tool.ts          # Circle Arc/Gateway/CCTP
        ├── arc-config.ts
        ├── ens-tool.ts          # ENS resolution
        └── yellow-tool.ts       # Yellow Network
```

**How it works:** The AI model receives tool definitions (Vercel AI SDK `tool()` with Zod schemas). When a user asks to perform a DeFi action, the model calls the appropriate tool server-side. Tools return transaction data (calldata, target address, value) which the frontend presents for the user to sign with their connected wallet.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5
- **AI**: Vercel AI SDK v3 with tool calling
- **Web3**: wagmi v3, viem v2
- **Styling**: Tailwind CSS v4
- **State**: TanStack React Query v5

## Getting Started

### Prerequisites

- Node.js 18+
- A browser wallet (MetaMask, etc.)

### Setup

```bash
git clone https://github.com/Raj-RR1/omnistrat-ai.git
cd omnistrat-ai
npm install
```

Create `.env.local`:

```env
# AI model — choose one
MODEL_PROVIDER=openai          # or "gemini"
OPENAI_API_KEY=sk-...          # required if using openai
GOOGLE_GENERATIVE_AI_API_KEY=  # required if using gemini
```

### Run
GOOGLE_GENERATIVE_AI_API_KEY=xxxxxxxxxxxx  # required if using gemini
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), connect your wallet, and start chatting.

### Supported Chains

Ethereum, Arbitrum, Polygon, Optimism, Base, Sepolia, Base Sepolia, Arc Testnet

## Example Prompts

- "What's my unified USDC balance across all chains?"
- "Swap 50 USDC to ETH on Arbitrum"
- "Bridge 100 USDC from Sepolia to Arc Testnet"
- "Supply 500 USDC to Aave on Polygon"
- "Resolve vitalik.eth and show their DeFi preferences"
- "Open a Yellow Network state channel"
- "Tell me about Circle Arc"

## License

MIT
