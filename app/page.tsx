'use client';

import { useChat } from 'ai/react';
import { ConnectWallet } from './components/ConnectWallet';

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
              <div className={`px-4 py-2 rounded-lg ${m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50'}`}>
                {m.content}
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
