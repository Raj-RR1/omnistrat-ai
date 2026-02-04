import { z } from 'zod';
import { tool } from 'ai';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

// ENS resolution happens on mainnet
const client = createPublicClient({
  chain: mainnet,
  transport: http(),
});

export const resolveEnsName = tool({
  description:
    'Resolve an ENS name (like vitalik.eth) to an Ethereum address. Use this when a user provides an ENS name instead of an address, or when you need to look up an address for a .eth name.',
  parameters: z.object({
    ensName: z.string().describe('The ENS name to resolve (e.g. "vitalik.eth")'),
  }),
  execute: async ({ ensName }) => {
    try {
      const normalizedName = normalize(ensName);
      const address = await client.getEnsAddress({ name: normalizedName });

      if (!address) {
        return {
          success: false,
          error: `No address found for ENS name: ${ensName}`,
        };
      }

      return {
        success: true,
        ensName,
        address,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to resolve ENS name';
      return {
        success: false,
        error: message,
      };
    }
  },
});

export const lookupEnsName = tool({
  description:
    'Look up the ENS name for an Ethereum address (reverse resolution). Use this to display a human-readable name instead of a raw address.',
  parameters: z.object({
    address: z.string().describe('The Ethereum address to look up'),
  }),
  execute: async ({ address }) => {
    try {
      const ensName = await client.getEnsName({ address: address as `0x${string}` });

      if (!ensName) {
        return {
          success: true,
          address,
          ensName: null,
          message: 'No ENS name found for this address',
        };
      }

      return {
        success: true,
        address,
        ensName,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to lookup ENS name';
      return {
        success: false,
        error: message,
      };
    }
  },
});

export const getEnsTextRecord = tool({
  description:
    'Get a text record from an ENS name. Text records can store arbitrary data like email, URL, avatar, Twitter handle, or custom keys. Use this to read user preferences or profile data stored in their ENS.',
  parameters: z.object({
    ensName: z.string().describe('The ENS name to query (e.g. "vitalik.eth")'),
    key: z.string().describe('The text record key to retrieve (e.g. "email", "url", "avatar", "com.twitter", "com.github", or custom keys)'),
  }),
  execute: async ({ ensName, key }) => {
    try {
      const normalizedName = normalize(ensName);
      const value = await client.getEnsText({ name: normalizedName, key });

      return {
        success: true,
        ensName,
        key,
        value: value || null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to get ENS text record';
      return {
        success: false,
        error: message,
      };
    }
  },
});

// OmniStrat-specific preference keys stored in ENS text records
const OMNISTRAT_PREF_KEYS = [
  'com.omnistrat.slippage',    // e.g. "0.5" (0.5%)
  'com.omnistrat.chains',      // e.g. "arbitrum,base,optimism"
  'com.omnistrat.risk',        // e.g. "conservative", "moderate", "aggressive"
  'com.omnistrat.gasLimit',    // e.g. "low", "medium", "high"
] as const;

export const getOmniStratPreferences = tool({
  description:
    'Get the user\'s DeFi preferences stored in their ENS text records. This reads OmniStrat-specific settings like preferred slippage, chains, and risk profile. Use this to personalize recommendations when the user has an ENS name.',
  parameters: z.object({
    ensName: z.string().describe('The ENS name to query for preferences (e.g. "user.eth")'),
  }),
  execute: async ({ ensName }) => {
    try {
      const normalizedName = normalize(ensName);

      // Fetch all preference keys in parallel
      const results = await Promise.all(
        OMNISTRAT_PREF_KEYS.map(async (key) => {
          try {
            const value = await client.getEnsText({ name: normalizedName, key });
            return { key, value: value || null };
          } catch {
            return { key, value: null };
          }
        })
      );

      const preferences: Record<string, string | null> = {};
      for (const { key, value } of results) {
        const shortKey = key.substring('com.omnistrat.'.length);
        preferences[shortKey] = value;
      }

      const hasAnyPreference = Object.values(preferences).some((v) => v !== null);

      return {
        success: true,
        ensName,
        preferences,
        hasPreferences: hasAnyPreference,
        message: hasAnyPreference
          ? 'Found OmniStrat preferences in ENS profile'
          : 'No OmniStrat preferences set in ENS profile. User can set them via ENS app.',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to get preferences';
      return {
        success: false,
        error: message,
      };
    }
  },
});

// Helper function to fetch preferences (for use in route.ts)
export async function fetchEnsPreferences(ensName: string): Promise<{
  slippage: string | null;
  chains: string | null;
  risk: string | null;
  gasLimit: string | null;
} | null> {
  try {
    const normalizedName = normalize(ensName);

    const [slippage, chains, risk, gasLimit] = await Promise.all([
      client.getEnsText({ name: normalizedName, key: 'com.omnistrat.slippage' }).catch(() => null),
      client.getEnsText({ name: normalizedName, key: 'com.omnistrat.chains' }).catch(() => null),
      client.getEnsText({ name: normalizedName, key: 'com.omnistrat.risk' }).catch(() => null),
      client.getEnsText({ name: normalizedName, key: 'com.omnistrat.gasLimit' }).catch(() => null),
    ]);

    return { slippage, chains, risk, gasLimit };
  } catch {
    return null;
  }
}

// Helper to get ENS name for an address (for use in route.ts)
export async function getEnsNameForAddress(address: string): Promise<string | null> {
  try {
    return await client.getEnsName({ address: address as `0x${string}` });
  } catch {
    return null;
  }
}
