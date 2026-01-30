'use client';

import { useChat } from 'ai/react';
import { ConnectWallet } from './components/ConnectWallet';

function formatAmount(amount: string, symbol: string): string {
  const decimals = ['USDC', 'USDT'].includes(symbol) ? 6 : 18;
  const value = Number(amount) / 10 ** decimals;
  return `${value.toFixed(decimals === 6 ? 2 : 6)} ${symbol}`;
}

function SwapQuoteCard({ output }: { output: any }) {
  if (!output.success) {
    return (
      <div className="my-2 p-3 rounded-lg bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-sm">
        Quote failed: {output.error}
      </div>
    );
  }

  const { estimate } = output;

  return (
    <div className="my-2 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 border dark:border-zinc-700 text-sm space-y-2">
      <p className="font-semibold text-zinc-900 dark:text-zinc-50">Swap Quote</p>
      <div className="grid grid-cols-2 gap-2 text-zinc-700 dark:text-zinc-300">
        <span>From:</span>
        <span>{formatAmount(estimate.fromAmount, estimate.fromToken)}</span>
        <span>To (estimated):</span>
        <span>{formatAmount(estimate.toAmount, estimate.toToken)}</span>
        <span>Min received:</span>
        <span>{formatAmount(estimate.toAmountMin, estimate.toToken)}</span>
        {estimate.executionDuration && (
          <>
            <span>Est. time:</span>
            <span>{estimate.executionDuration}s</span>
          </>
        )}
      </div>
      {output.transactionRequest && (
        <button
          className="mt-2 w-full px-4 py-2 font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600"
          onClick={() => {
            // Task 3 will wire this up with useSendTransaction
            alert('Transaction execution coming in Task 3');
          }}
        >
          Execute Swap
        </button>
      )}
    </div>
  );
}

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between p-4 border-b dark:border-zinc-800">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">OmniStrat AI</h1>
        <ConnectWallet />
      </header>
      <main className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-lg ${m.role === 'user' ? 'bg-blue-500 text-white px-4 py-2 rounded-lg' : ''}`}>
                {m.content && (
                  <div className={m.role === 'assistant' ? 'px-4 py-2 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50' : ''}>
                    {m.content}
                  </div>
                )}
                {(m as any).toolInvocations?.map((invocation: any, idx: number) => {
                  if (
                    invocation.toolName === 'getSwapQuote' &&
                    invocation.state === 'result'
                  ) {
                    return <SwapQuoteCard key={idx} output={invocation.result} />;
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
        </div>
      </main>
      <footer className="p-4 border-t dark:border-zinc-800">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask me anything about DeFi..."
            className="flex-1 px-4 py-2 border rounded-full dark:bg-zinc-800 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-2 font-semibold text-white bg-blue-500 rounded-full hover:bg-blue-600 disabled:opacity-50"
            disabled={!input.trim()}
          >
            Send
          </button>
        </form>
      </footer>
    </div>
  );
}
