'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

// Yellow Network ClearNode endpoints
const CLEARNODE_URL = process.env.NEXT_PUBLIC_YELLOW_SANDBOX === 'true'
  ? 'wss://clearnet-sandbox.yellow.com/ws'
  : 'wss://clearnet.yellow.com/ws';

export type YellowSessionStatus = 'disconnected' | 'connecting' | 'authenticating' | 'active' | 'error';

export interface YellowSessionState {
  status: YellowSessionStatus;
  channelId: string | null;
  balance: string;
  tokenSymbol: string;
  tokenDecimals: number;
  error: string | null;
}

export interface YellowContextValue {
  session: YellowSessionState;
  connect: () => Promise<void>;
  disconnect: () => void;
  // These will be implemented in Part 3/6
  openChannel: (amount: string, tokenAddress: string) => Promise<string | null>;
  closeChannel: () => Promise<string | null>;
  instantTransfer: (to: string, amount: string) => Promise<boolean>;
  isSupported: boolean;
}

const initialState: YellowSessionState = {
  status: 'disconnected',
  channelId: null,
  balance: '0',
  tokenSymbol: 'USDC',
  tokenDecimals: 6,
  error: null,
};

const YellowContext = createContext<YellowContextValue | null>(null);

export function YellowProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [session, setSession] = useState<YellowSessionState>(initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Yellow Network supports Ethereum, Arbitrum, Base
  const isSupported = isConnected && [1, 42161, 8453].includes(chainId || 0);

  // Clean up WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  // Reset session when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      disconnect();
    }
  }, [isConnected]);

  const connect = useCallback(async () => {
    if (!address || !isSupported) {
      setSession(prev => ({
        ...prev,
        status: 'error',
        error: 'Wallet not connected or chain not supported',
      }));
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    setSession(prev => ({ ...prev, status: 'connecting', error: null }));

    try {
      const ws = new WebSocket(CLEARNODE_URL);
      wsRef.current = ws;

      ws.onopen = async () => {
        console.log('[Yellow] WebSocket connected');
        setSession(prev => ({ ...prev, status: 'authenticating' }));

        try {
          // Authenticate with ClearNode using wallet signature
          await authenticate(ws, address);
        } catch (err) {
          console.error('[Yellow] Authentication failed:', err);
          setSession(prev => ({
            ...prev,
            status: 'error',
            error: err instanceof Error ? err.message : 'Authentication failed',
          }));
          ws.close();
        }
      };

      ws.onmessage = (event) => {
        handleMessage(event.data);
      };

      ws.onerror = (error) => {
        console.error('[Yellow] WebSocket error:', error);
        setSession(prev => ({
          ...prev,
          status: 'error',
          error: 'WebSocket connection error',
        }));
      };

      ws.onclose = (event) => {
        console.log('[Yellow] WebSocket closed:', event.code, event.reason);
        wsRef.current = null;

        // Only set to disconnected if not already in error state
        setSession(prev => {
          if (prev.status === 'error') return prev;
          return { ...initialState };
        });
      };

    } catch (err) {
      console.error('[Yellow] Connection failed:', err);
      setSession(prev => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Connection failed',
      }));
    }
  }, [address, isSupported]);

  const authenticate = async (ws: WebSocket, walletAddress: string) => {
    // Request authentication challenge from ClearNode
    const challengeRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'auth_challenge',
      params: { address: walletAddress },
    };

    ws.send(JSON.stringify(challengeRequest));

    // Wait for challenge response and sign it
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 30000);

      const authHandler = async (event: MessageEvent) => {
        try {
          const response = JSON.parse(event.data);

          if (response.id === 1 && response.result?.challenge) {
            // Sign the challenge with wallet
            const signature = await signMessageAsync({
              message: response.result.challenge,
            });

            // Send signed challenge back
            const authRequest = {
              jsonrpc: '2.0',
              id: 2,
              method: 'auth_verify',
              params: {
                address: walletAddress,
                signature,
              },
            };
            ws.send(JSON.stringify(authRequest));
          } else if (response.id === 2) {
            clearTimeout(timeout);
            ws.removeEventListener('message', authHandler);

            if (response.result?.authenticated) {
              console.log('[Yellow] Authenticated successfully');
              setSession(prev => ({
                ...prev,
                status: 'active',
                channelId: response.result.channelId || null,
                balance: response.result.balance || '0',
              }));
              resolve();
            } else {
              reject(new Error(response.error?.message || 'Authentication rejected'));
            }
          }
        } catch (err) {
          clearTimeout(timeout);
          ws.removeEventListener('message', authHandler);
          reject(err);
        }
      };

      ws.addEventListener('message', authHandler);
    });
  };

  const handleMessage = (data: string) => {
    try {
      const message = JSON.parse(data);

      // Handle different message types
      if (message.method === 'balance_update') {
        setSession(prev => ({
          ...prev,
          balance: message.params.balance,
        }));
      } else if (message.method === 'channel_opened') {
        setSession(prev => ({
          ...prev,
          channelId: message.params.channelId,
          balance: message.params.balance,
        }));
      } else if (message.method === 'channel_closed') {
        setSession(prev => ({
          ...prev,
          channelId: null,
          balance: '0',
        }));
      }

      // Log other messages for debugging
      console.log('[Yellow] Message:', message);
    } catch (err) {
      console.error('[Yellow] Failed to parse message:', err);
    }
  };

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setSession(initialState);
  }, []);

  // Placeholder for Part 3 - will build on-chain transaction
  const openChannel = useCallback(async (amount: string, tokenAddress: string): Promise<string | null> => {
    console.log('[Yellow] openChannel called:', { amount, tokenAddress });
    // TODO: Implement in Part 3
    return null;
  }, []);

  // Placeholder for Part 3 - will build on-chain transaction
  const closeChannel = useCallback(async (): Promise<string | null> => {
    console.log('[Yellow] closeChannel called');
    // TODO: Implement in Part 3
    return null;
  }, []);

  // Placeholder for Part 6 - instant off-chain transfer
  const instantTransfer = useCallback(async (to: string, amount: string): Promise<boolean> => {
    if (!wsRef.current || session.status !== 'active') {
      console.error('[Yellow] Cannot transfer: session not active');
      return false;
    }

    console.log('[Yellow] instantTransfer called:', { to, amount });
    // TODO: Implement in Part 6
    return false;
  }, [session.status]);

  const value: YellowContextValue = {
    session,
    connect,
    disconnect,
    openChannel,
    closeChannel,
    instantTransfer,
    isSupported,
  };

  return (
    <YellowContext.Provider value={value}>
      {children}
    </YellowContext.Provider>
  );
}

export function useYellow() {
  const context = useContext(YellowContext);
  if (!context) {
    throw new Error('useYellow must be used within a YellowProvider');
  }
  return context;
}
