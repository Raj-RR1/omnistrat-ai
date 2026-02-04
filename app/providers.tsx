'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http, createStorage } from 'wagmi';
import { mainnet, sepolia, arbitrum, polygon, optimism, base } from 'wagmi/chains';

const config = createConfig({
  chains: [mainnet, arbitrum, polygon, optimism, base, sepolia],
  // Connectors are created on-demand in ConnectWallet to avoid auto-probing locked wallets
  connectors: [],
  // Disable storage to prevent auto-reconnect on page load, which causes errors
  // when MetaMask is locked ("wallet must have at least one account").
  // Users must click "Connect Wallet" each session — acceptable UX tradeoff for hackathon.
  storage: createStorage({
    storage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
  }),
  transports: {
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [polygon.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
    [sepolia.id]: http(),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  // Workaround for MetaMask's auto-probe error on page load.
  // MetaMask injects into the page and probes for accounts even when locked,
  // throwing "wallet must have at least one account" (code 4001).
  // This handler only suppresses that specific error — other rejections pass through.
  // See: https://github.com/MetaMask/metamask-extension/issues/10085
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const isMetaMaskProbeError =
        event.reason?.code === 4001 &&
        typeof event.reason?.message === 'string' &&
        event.reason.message.includes('account');
      if (isMetaMaskProbeError) {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
