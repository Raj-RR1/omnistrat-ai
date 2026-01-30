'use client';

import { useConnection, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

export function ConnectWallet() {
  const { address, isConnected, chain } = useConnection();
  const { mutate: connect } = useConnect();
  const { mutate: disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <p className="text-sm">{chain?.name}</p>
        <p className="text-sm">{`${address?.slice(0, 6)}...${address?.slice(-4)}`}</p>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 font-semibold text-white bg-red-500 rounded-full hover:bg-red-600"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      className="px-4 py-2 font-semibold text-white bg-blue-500 rounded-full hover:bg-blue-600"
    >
      Connect Wallet
    </button>
  );
}