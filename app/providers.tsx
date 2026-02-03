'use client';

import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http, createStorage } from 'wagmi';
import { mainnet, sepolia, arbitrum, polygon, optimism, base } from 'wagmi/chains';

const config = createConfig({
  chains: [mainnet, arbitrum, polygon, optimism, base, sepolia],
  connectors: [],
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

  // Suppress MetaMask's auto-probe errors
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      if (event.reason?.code === 4001 && event.reason?.message?.includes('account')) {
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
