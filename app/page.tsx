'use client';

import { useChat } from 'ai/react';
import { useEffect, useState } from 'react';
import { useConnection, useSendTransaction, useSwitchChain, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectWallet } from './components/ConnectWallet';

// TODO: Fetch token decimals dynamically or from a centralized config
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

function TokenBalancesCard({ output }: { output: any }) {
  if (!output.success) {
    return (
      <div className="my-2 p-3 rounded-lg bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-sm">
        Failed to fetch balances: {output.error}
      </div>
    );
  }

  const { balances, tokenCount, note } = output;

  if (tokenCount === 0) {
    return (
      <div className="my-2 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 border dark:border-zinc-700 text-sm">
        <p className="text-zinc-600 dark:text-zinc-400">No tokens found across chains.</p>
      </div>
    );
  }

  return (
    <div className="my-2 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 border dark:border-zinc-700 text-sm space-y-3">
      <div className="flex justify-between items-center">
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">Token Balances</p>
        <p className="text-zinc-600 dark:text-zinc-400">{tokenCount} tokens</p>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {balances.map((token: any, idx: number) => (
          <div key={idx} className="flex justify-between items-center py-1 border-b dark:border-zinc-700 last:border-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{token.symbol}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-500">{token.chainName}</span>
            </div>
            <div className="text-right">
              <p className="text-zinc-900 dark:text-zinc-100">{token.amountFormatted}</p>
            </div>
          </div>
        ))}
      </div>
      {note && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{note}</p>
      )}
    </div>
  );
}

function AavePositionCard({ output }: { output: any }) {
  if (!output.success) {
    return (
      <div className="my-2 p-3 rounded-lg bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-sm">
        Position fetch failed: {output.error}
      </div>
    );
  }

  const { position } = output;

  return (
    <div className="my-2 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 border dark:border-zinc-700 text-sm space-y-2">
      <p className="font-semibold text-zinc-900 dark:text-zinc-50">Aave v3 Position</p>
      <div className="grid grid-cols-2 gap-2 text-zinc-700 dark:text-zinc-300">
        <span>Total Collateral:</span>
        <span>${position.totalCollateralUSD}</span>
        <span>Total Debt:</span>
        <span>${position.totalDebtUSD}</span>
        <span>Available to Borrow:</span>
        <span>${position.availableBorrowsUSD}</span>
        <span>Health Factor:</span>
        <span>{position.healthFactor}</span>
        <span>LTV:</span>
        <span>{position.ltv}</span>
      </div>
    </div>
  );
}

function AaveTransactionCard({
  output,
  args,
  onExecute,
  txStatus,
  txHash,
}: {
  output: any;
  args?: any;
  onExecute: (tx: any) => void;
  txStatus: 'idle' | 'switching' | 'pending' | 'confirming' | 'success' | 'error';
  txHash?: string;
}) {
  if (!output.success) {
    return (
      <div className="my-2 p-3 rounded-lg bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-sm">
        Failed: {output.error}
      </div>
    );
  }

  const [currentStep, setCurrentStep] = useState(0);
  const transactions = output.transactions;

  // Try to format amount from the tool args
  const amount = args?.amount;
  const asset = args?.asset?.toLowerCase();
  const chainNames: Record<number, string> = { 1: 'Ethereum', 42161: 'Arbitrum', 137: 'Polygon', 10: 'Optimism', 8453: 'Base' };
  const chainName = args?.chainId ? chainNames[args.chainId] || `Chain ${args.chainId}` : '';

  // Known token addresses to symbols
  const TOKEN_SYMBOLS: Record<string, string> = {
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 'USDC',
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC',
    '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': 'USDC',
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC',
    '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT',
    '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 'WETH',
    '0x0000000000000000000000000000000000000000': 'ETH',
  };
  const tokenSymbol = asset ? TOKEN_SYMBOLS[asset] || 'TOKEN' : 'TOKEN';

  return (
    <div className="my-2 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900 border dark:border-zinc-700 text-sm space-y-3">
      <p className="font-semibold text-zinc-900 dark:text-zinc-50">Aave Transaction</p>
      {amount && (
        <div className="text-zinc-700 dark:text-zinc-300">
          <span>Amount: {formatAmount(amount, tokenSymbol)}</span>
          {chainName && <span> on {chainName}</span>}
        </div>
      )}
      {transactions.map((tx: any, idx: number) => (
        <div key={idx} className="space-y-1">
          <p className="text-zinc-600 dark:text-zinc-400">
            Step {idx + 1}: {tx.description}
          </p>
          {idx === currentStep && (
            <>
              {txStatus === 'success' && txHash ? (
                <div className="p-2 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs">
                  Done! Tx:{' '}
                  <a
                    href={`${EXPLORER_URLS[tx.transactionRequest?.chainId] || 'https://etherscan.io'}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {txHash.slice(0, 10)}...{txHash.slice(-8)}
                  </a>
                  {idx < transactions.length - 1 && (
                    <button
                      className="ml-2 underline text-green-700 dark:text-green-300"
                      onClick={() => setCurrentStep(idx + 1)}
                    >
                      Next step
                    </button>
                  )}
                </div>
              ) : txStatus === 'error' ? (
                <div className="p-2 rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs">
                  Transaction failed. Please try again.
                </div>
              ) : (
                <button
                  className="w-full px-4 py-2 font-semibold text-white bg-purple-500 rounded-lg hover:bg-purple-600 disabled:opacity-50"
                  disabled={txStatus !== 'idle'}
                  onClick={() => onExecute(tx.transactionRequest)}
                >
                  {txStatus === 'switching'
                    ? 'Switching chain...'
                    : txStatus === 'pending'
                      ? 'Confirm in wallet...'
                      : txStatus === 'confirming'
                        ? 'Confirming...'
                        : `Execute: ${tx.description}`}
                </button>
              )}
            </>
          )}
          {idx < currentStep && (
            <p className="text-xs text-green-600 dark:text-green-400">Completed</p>
          )}
          {idx > currentStep && (
            <p className="text-xs text-zinc-400">Waiting...</p>
          )}
        </div>
      ))}
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

  useEffect(() => {
    if (isConfirmed) setTxState('success');
  }, [isConfirmed]);

  async function handleExecuteSwap(txRequest: any) {
    try {
      const targetChainId = txRequest.chainId;

      if (chain?.id !== targetChainId) {
        setTxState('switching');
        await switchChain({ chainId: targetChainId });
      }

      setTxState('pending');
      await sendTransaction({
        to: txRequest.to as `0x${string}`,
        data: txRequest.data as `0x${string}`,
        value: txRequest.value ? BigInt(txRequest.value) : undefined,
        chainId: targetChainId,
      });

      setTxState('confirming');
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
                  if (invocation.state !== 'result') return null;
                  if (invocation.toolName === 'getSwapQuote') {
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
                  if (invocation.toolName === 'getTokenBalances') {
                    return <TokenBalancesCard key={idx} output={invocation.result} />;
                  }
                  if (invocation.toolName === 'getAaveUserPosition') {
                    return <AavePositionCard key={idx} output={invocation.result} />;
                  }
                  if (invocation.toolName === 'getAaveSupplyTx' || invocation.toolName === 'getAaveWithdrawTx') {
                    return (
                      <AaveTransactionCard
                        key={idx}
                        output={invocation.result}
                        args={invocation.args}
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
