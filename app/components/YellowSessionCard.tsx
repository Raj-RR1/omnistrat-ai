'use client';

import { useYellow } from '../contexts/YellowContext';

// Status indicator colors
const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  disconnected: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-600 dark:text-zinc-400', dot: 'bg-zinc-400' },
  connecting: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
  authenticating: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
  active: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', dot: 'bg-green-500' },
  error: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500' },
};

const STATUS_LABELS: Record<string, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting...',
  authenticating: 'Authenticating...',
  active: 'Active',
  error: 'Error',
};

export function YellowSessionCard() {
  const { session, connect, disconnect, isSupported } = useYellow();

  const colors = STATUS_COLORS[session.status] || STATUS_COLORS.disconnected;
  const statusLabel = STATUS_LABELS[session.status] || 'Unknown';

  // Format balance for display
  const formatBalance = (raw: string, decimals: number): string => {
    const value = BigInt(raw || '0');
    const divisor = BigInt(10 ** decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0').slice(0, 2);
    return `${integerPart}.${fractionalStr}`;
  };

  const formattedBalance = formatBalance(session.balance, session.tokenDecimals);

  return (
    <div className="border dark:border-zinc-700 rounded-lg p-3 bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Yellow Network</span>
          <span className="text-xs text-zinc-500">State Channels</span>
        </div>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} ${session.status === 'connecting' || session.status === 'authenticating' ? 'animate-pulse' : ''}`} />
          {statusLabel}
        </div>
      </div>

      {/* Content based on status */}
      {session.status === 'disconnected' && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Enable instant, gas-free operations via state channels.
          </p>
          {isSupported ? (
            <button
              onClick={connect}
              className="w-full px-3 py-1.5 text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 rounded-md transition-colors"
            >
              Connect Session
            </button>
          ) : (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Switch to Ethereum, Arbitrum, or Base to use Yellow Network.
            </p>
          )}
        </div>
      )}

      {(session.status === 'connecting' || session.status === 'authenticating') && (
        <div className="flex items-center gap-2 py-2">
          <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {session.status === 'connecting' ? 'Connecting to ClearNode...' : 'Sign message to authenticate...'}
          </span>
        </div>
      )}

      {session.status === 'active' && (
        <div className="space-y-2">
          {/* Balance display */}
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-zinc-500">Session Balance</span>
            <span className="text-lg font-semibold">
              {formattedBalance} <span className="text-sm font-normal text-zinc-500">{session.tokenSymbol}</span>
            </span>
          </div>

          {/* Channel ID (truncated) */}
          {session.channelId && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Channel</span>
              <span className="font-mono text-zinc-600 dark:text-zinc-400">
                {session.channelId.slice(0, 8)}...{session.channelId.slice(-6)}
              </span>
            </div>
          )}

          {/* Capabilities */}
          <div className="flex gap-1 flex-wrap">
            <span className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
              Instant
            </span>
            <span className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
              Gas-free
            </span>
          </div>

          {/* Disconnect button */}
          <button
            onClick={disconnect}
            className="w-full px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-md transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}

      {session.status === 'error' && (
        <div className="space-y-2">
          <p className="text-xs text-red-600 dark:text-red-400">
            {session.error || 'Connection failed'}
          </p>
          <button
            onClick={connect}
            className="w-full px-3 py-1.5 text-sm font-medium text-white bg-yellow-500 hover:bg-yellow-600 rounded-md transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}
    </div>
  );
}
