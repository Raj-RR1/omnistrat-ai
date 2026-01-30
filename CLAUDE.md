# OmniStrat AI

AI-powered DeFi strategy assistant built for the Hack Money hackathon.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5
- **AI**: Vercel AI SDK v3, supports OpenAI GPT-4o and Google Gemini 2.0 Flash (set via `MODEL_PROVIDER` env var)
- **Web3**: wagmi v3, viem v2 (wallet connection via injected connector)
- **Styling**: Tailwind CSS v4
- **State**: TanStack React Query v5

## Project Structure

- `app/page.tsx` — Main chat UI (client component using `useChat` from `ai/react`)
- `app/api/chat/route.ts` — Streaming chat API endpoint
- `app/components/ConnectWallet.tsx` — Wallet connect/disconnect button
- `app/providers.tsx` — wagmi + React Query providers
- `app/layout.tsx` — Root layout

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint

## Environment Variables

Set in `.env.local`:
- `MODEL_PROVIDER` — `openai` (default) or `gemini`
- `OPENAI_API_KEY` — Required when using OpenAI
- `GOOGLE_GENERATIVE_AI_API_KEY` — Required when using Gemini

## Conventions

- Use `'use client'` directive for components that use React hooks
- wagmi v3: use `mutate` instead of deprecated `connect`/`disconnect`
- AI SDK v3: use `toDataStreamResponse()` and `useChat` from `ai/react`
- Keep components in `app/components/`
- API routes in `app/api/`
