'use client';

import { useChat } from 'ai/react';
import { useState } from 'react';
import { useConnection, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectWallet } from './components/ConnectWallet';

function formatAmount(amount: string, symbol: string): string {
  const decimals = ['USDC', 'USDT'].includes(symbol) ? 6 : 18;
  const value = Number(amount) / 10 ** decimals;
  return `${value.toFixed(decimals === 6 ? 2 : 6)} ${symbol}`;
}

const EXPLORER_URLS: Record<number, string> = {
  1: 'https://etherscan.io',
  42161: 'https://arbiscan.io',
  137: 'https://polygonscan.com',
  10: 'https://optimistic.etherscan.io',
  8453: 'https://basescan.org',
  11155111: 'https://sepolia.etherscan.io',
};

function SwapQuoteCard({
  output,
  onExecute,
  txStatus,
  txHash,
}: {
  output: any;
  onExecute: (tx: any) => void;
  txStatus: 'idle' | 'switching' | 'pending' | 'confirming' | 'success' | 'error';
  txHash?: string;
}) {
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
        {estimate.executionDuration > 0 && (
          <>
            <span>Est. time:</span>
            <span>{estimate.executionDuration}s</span>
          </>
        )}
      </div>
      {output.transactionRequest && (
        <>
          {txStatus === 'success' && txHash ? (
            <div className="mt-2 p-2 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs">
              Swap executed! Tx:{' '}
              <a
                href={`${EXPLORER_URLS[output.transactionRequest?.chainId] || 'https://etherscan.io'}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </a>
            </div>
          ) : txStatus === 'error' ? (
            <div className="mt-2 p-2 rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs">
              Transaction failed. Please try again.
            </div>
          ) : (
            <button
              className="mt-2 w-full px-4 py-2 font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-50"
              disabled={txStatus !== 'idle'}
              onClick={() => onExecute(output.transactionRequest)}
            >
              {txStatus === 'switching'
                ? 'Switching chain...'
                : txStatus === 'pending'
                  ? 'Confirm in wallet...'
                  : txStatus === 'confirming'
                    ? 'Confirming...'
                    : 'Execute Swap'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function Home() {
  const { address, chain } = useConnection();
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    body: { walletAddress: address },
  });
  const { mutateAsync: sendTransaction, data: txHash, status: sendStatus, reset: resetTx } = useSendTransaction();
  const { mutateAsync: switchChain } = useSwitchChain();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const [txState, setTxState] = useState<'idle' | 'switching' | 'pending' | 'confirming' | 'success' | 'error'>('idle');

  async function handleExecuteSwap(txRequest: any) {
    try {
      const targetChainId = txRequest.chainId;

      if (chain?.id !== targetChainId) {
        setTxState('switching');
        await switchChain({ chainId: targetChainId });
      }

      setTxState('pending');
      const hash = await sendTransaction({
        to: txRequest.to as `0x${string}`,
        data: txRequest.data as `0x${string}`,
        value: txRequest.value ? BigInt(txRequest.value) : undefined,
        chainId: targetChainId,
      });

      setTxState('confirming');
      // Wait briefly then mark success — the useWaitForTransactionReceipt will track confirmation
      setTxState('success');
    } catch (err) {
      console.error('Swap execution failed:', err);
      setTxState('error');
      setTimeout(() => {
        setTxState('idle');
        resetTx();
      }, 3000);
    }
  }

  const currentTxStatus = txState;
  const currentTxHash = txHash;

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
                    return (
                      <SwapQuoteCard
                        key={idx}
                        output={invocation.result}
                        onExecute={handleExecuteSwap}
                        txStatus={currentTxStatus}
                        txHash={currentTxHash}
                      />
                    );
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
