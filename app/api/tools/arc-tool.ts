import { z } from 'zod';
import { tool } from 'ai';
import { encodeFunctionData, maxUint256, pad } from 'viem';
import { formatTokenAmount } from '../../lib/format';
import {
  GATEWAY_API,
  GATEWAY_CONTRACTS,
  GATEWAY_WALLET_ABI,
  CCTP_TOKEN_MESSENGER_ABI,
  ERC20_APPROVE_ABI,
  MESSAGE_TRANSMITTER_ABI,
  CCTP_DOMAINS,
  CCTP_TOKEN_MESSENGER,
  CCTP_MESSAGE_TRANSMITTER,
  CCTP_ATTESTATION_API,
  DOMAIN_TO_CHAIN_ID,
  USDC_ADDRESSES,
  ARC_SUPPORTED_CHAINS,
} from './arc-config';

// Use testnet by default (switch to mainnet for production)
const NETWORK = 'testnet' as const;

export const getArcInfo = tool({
  description:
    'Get information about Circle Arc network and its USDC ecosystem. Use when the user asks about Arc, chain-abstracted USDC, unified USDC balance, Circle Gateway, CCTP bridging, or native USDC transfers.',
  parameters: z.object({}),
  execute: async () => {
    return {
      success: true,
      name: 'Circle Arc',
      description: 'Layer-1 blockchain purpose-built for programmable money. Uses USDC as native gas token with sub-second finality.',
      features: [
        'USDC as native gas — pay transaction fees in dollars, not volatile tokens',
        'Sub-second deterministic finality via Malachite BFT consensus',
        'EVM-compatible — deploy existing Solidity contracts directly',
        'Circle Gateway — unified USDC balance across 30+ chains',
        'CCTP v2 — native USDC bridging with no wrapped tokens',
        'Bridge Kit SDK — transfer USDC across chains with minimal code',
      ],
      gateway: {
        description: 'Maintain a single unified USDC balance accessible across all supported chains. Deposit on any chain, transfer instantly (<500ms) to any other.',
        supportedChains: ARC_SUPPORTED_CHAINS[NETWORK].length,
      },
      cctp: {
        description: 'Cross-Chain Transfer Protocol — burn USDC on source chain, Circle automatically mints native USDC on destination. No wrapped tokens.',
      },
      supportedChains: ARC_SUPPORTED_CHAINS[NETWORK],
      links: {
        docs: 'https://docs.arc.network',
        gateway: 'https://developers.circle.com/gateway',
        faucet: 'https://faucet.circle.com',
        explorer: 'https://testnet.arcscan.app',
      },
    };
  },
});

export const getArcSupportedChains = tool({
  description:
    'List all chains supported by Arc/Gateway/CCTP for USDC operations. Use when the user asks what chains are available for Arc bridging, Gateway deposits, or USDC transfers.',
  parameters: z.object({}),
  execute: async () => {
    const chains = ARC_SUPPORTED_CHAINS[NETWORK].map(chain => ({
      ...chain,
      usdcAddress: USDC_ADDRESSES[chain.chainId] || 'N/A',
      hasCCTP: !!CCTP_TOKEN_MESSENGER[chain.chainId],
      hasGateway: true,
    }));

    return {
      success: true,
      network: NETWORK,
      chains,
      totalChains: chains.length,
      note: `Currently configured for ${NETWORK}. All chains support Gateway unified balance and CCTP native bridging.`,
    };
  },
});

export const getGatewayBalance = tool({
  description:
    'Query unified USDC balance across all supported chains via Circle Gateway. Use when the user asks "what\'s my total USDC", "unified balance", "USDC across chains", or wants to see their chain-abstracted USDC position.',
  parameters: z.object({
    depositorAddress: z.string().describe('The wallet address to check Gateway balance for'),
  }),
  execute: async ({ depositorAddress }) => {
    try {
      const chains = ARC_SUPPORTED_CHAINS[NETWORK];
      const sources = chains.map(chain => ({
        domain: chain.domain,
        depositor: depositorAddress,
      }));

      const response = await fetch(`${GATEWAY_API[NETWORK]}/balances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'USDC', sources }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Gateway API returned ${response.status}: ${errorText}`,
        };
      }

      const result = await response.json();
      const balances = (result.balances || []).map((b: { domain: number; balance: string }) => {
        const chain = chains.find(c => c.domain === b.domain);
        return {
          chainName: chain?.name || `Domain ${b.domain}`,
          chainId: chain?.chainId,
          domain: b.domain,
          balance: b.balance,
          balanceFormatted: parseFloat(b.balance).toFixed(6),
        };
      });

      const totalBalance = balances.reduce(
        (sum: number, b: { balance: string }) => sum + parseFloat(b.balance),
        0
      );

      return {
        success: true,
        depositor: depositorAddress,
        totalBalance: totalBalance.toFixed(6),
        totalBalanceUSD: `$${totalBalance.toFixed(2)}`,
        balances,
        chainCount: balances.length,
        note: totalBalance === 0
          ? 'No Gateway balance found. Deposit USDC into the Gateway Wallet on any supported chain to create a unified balance.'
          : 'Your unified USDC balance is accessible across all supported chains via Gateway.',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to query Gateway balance';
      return {
        success: false,
        error: message,
      };
    }
  },
});

export const buildGatewayDepositTx = tool({
  description:
    'Build transactions to deposit USDC into Circle Gateway to create a unified cross-chain balance. Returns approve + deposit transactions. Use when the user wants to "deposit into Gateway", "create unified balance", or "fund my Gateway wallet".',
  parameters: z.object({
    userAddress: z.string().describe('The user wallet address'),
    chainId: z.number().describe('Chain ID to deposit from (e.g., 11155111 = Sepolia, 84532 = Base Sepolia, 5042002 = Arc Testnet)'),
    amount: z.string().describe('Amount to deposit in smallest unit (e.g., 1000000 for 1 USDC with 6 decimals)'),
  }),
  execute: async ({ userAddress: _userAddress, chainId, amount }) => {
    try {
      // Validate chain support
      const chain = ARC_SUPPORTED_CHAINS[NETWORK].find(c => c.chainId === chainId);
      if (!chain) {
        return {
          success: false,
          error: `Chain ${chainId} not supported for Gateway deposits. Supported: ${ARC_SUPPORTED_CHAINS[NETWORK].map(c => `${c.name} (${c.chainId})`).join(', ')}`,
        };
      }

      const usdcAddress = USDC_ADDRESSES[chainId];
      if (!usdcAddress) {
        return {
          success: false,
          error: `No USDC address configured for chain ${chainId}`,
        };
      }

      const gatewayWallet = GATEWAY_CONTRACTS[NETWORK].wallet;

      // Build approve transaction
      const approveData = encodeFunctionData({
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [gatewayWallet, maxUint256],
      });

      // Build deposit transaction
      const depositData = encodeFunctionData({
        abi: GATEWAY_WALLET_ABI,
        functionName: 'deposit',
        args: [usdcAddress, BigInt(amount)],
      });

      const formattedAmount = formatTokenAmount(amount, 6);

      return {
        success: true,
        type: 'gateway_deposit',
        chainId,
        chainName: chain.name,
        depositAmount: {
          raw: amount,
          formatted: formattedAmount,
          symbol: 'USDC',
        },
        transactions: [
          {
            step: 1,
            name: 'Approve USDC',
            description: `Allow Gateway Wallet to spend your USDC on ${chain.name}`,
            to: usdcAddress,
            data: approveData,
            value: '0',
          },
          {
            step: 2,
            name: 'Deposit to Gateway',
            description: `Deposit ${formattedAmount} USDC into Circle Gateway for unified cross-chain access`,
            to: gatewayWallet,
            data: depositData,
            value: '0',
          },
        ],
        contracts: {
          gatewayWallet,
          usdc: usdcAddress,
        },
        nextStep: 'After depositing, your USDC will be part of a unified balance accessible across all supported chains. Use "bridge USDC" to transfer to any destination chain instantly.',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to build Gateway deposit transaction';
      return {
        success: false,
        error: message,
      };
    }
  },
});

export const buildUSDCBridgeTx = tool({
  description:
    'Build transactions to bridge USDC between chains using Circle CCTP v2 (native burn-and-mint). Returns approve + depositForBurn transactions. Circle automatically mints USDC on the destination chain. Use when the user wants to "bridge USDC", "send USDC to another chain", or "transfer USDC cross-chain". Prefer this over LI.FI when specifically bridging USDC for faster native transfers.',
  parameters: z.object({
    userAddress: z.string().describe('The user wallet address'),
    sourceChainId: z.number().describe('Source chain ID (e.g., 11155111 = Sepolia, 84532 = Base Sepolia)'),
    destinationChainId: z.number().describe('Destination chain ID (e.g., 5042002 = Arc Testnet, 84532 = Base Sepolia)'),
    amount: z.string().describe('Amount to bridge in smallest unit (e.g., 1000000 for 1 USDC with 6 decimals)'),
  }),
  execute: async ({ userAddress, sourceChainId, destinationChainId, amount }) => {
    try {
      // Validate source chain
      const sourceChain = ARC_SUPPORTED_CHAINS[NETWORK].find(c => c.chainId === sourceChainId);
      if (!sourceChain) {
        return {
          success: false,
          error: `Source chain ${sourceChainId} not supported. Supported: ${ARC_SUPPORTED_CHAINS[NETWORK].map(c => `${c.name} (${c.chainId})`).join(', ')}`,
        };
      }

      // Validate destination chain
      const destChain = ARC_SUPPORTED_CHAINS[NETWORK].find(c => c.chainId === destinationChainId);
      if (!destChain) {
        return {
          success: false,
          error: `Destination chain ${destinationChainId} not supported. Supported: ${ARC_SUPPORTED_CHAINS[NETWORK].map(c => `${c.name} (${c.chainId})`).join(', ')}`,
        };
      }

      if (sourceChainId === destinationChainId) {
        return {
          success: false,
          error: 'Source and destination chains must be different for bridging.',
        };
      }

      const sourceUSDC = USDC_ADDRESSES[sourceChainId];
      if (!sourceUSDC) {
        return {
          success: false,
          error: `No USDC address configured for source chain ${sourceChainId}`,
        };
      }

      const tokenMessenger = CCTP_TOKEN_MESSENGER[sourceChainId];
      if (!tokenMessenger) {
        return {
          success: false,
          error: `CCTP TokenMessenger not available on chain ${sourceChainId}`,
        };
      }

      const destinationDomain = CCTP_DOMAINS[destinationChainId];
      if (destinationDomain === undefined) {
        return {
          success: false,
          error: `No CCTP domain ID for destination chain ${destinationChainId}`,
        };
      }

      // Convert user address to bytes32 for mintRecipient
      // pad left-pads the address to 32 bytes
      const mintRecipient = pad(userAddress as `0x${string}`, { size: 32 });
      // bytes32(0) allows any address to call receiveMessage on destination
      const destinationCaller = pad('0x00' as `0x${string}`, { size: 32 });

      // Build approve transaction
      const approveData = encodeFunctionData({
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [tokenMessenger, BigInt(amount)],
      });

      // Build depositForBurn transaction (CCTP v2: 7 params)
      const depositForBurnData = encodeFunctionData({
        abi: CCTP_TOKEN_MESSENGER_ABI,
        functionName: 'depositForBurn',
        args: [
          BigInt(amount),
          destinationDomain,
          mintRecipient,
          sourceUSDC,
          destinationCaller,
          // TODO: Make maxFee configurable or fetch dynamically for production
          BigInt(500),        // maxFee: 0.0005 USDC (per Circle's testnet example)
          // TODO: Make minFinalityThreshold configurable (1000=Fast, 2000=Standard)
          1000,               // minFinalityThreshold: Fast Transfer
        ],
      });

      const formattedAmount = formatTokenAmount(amount, 6);

      return {
        success: true,
        type: 'cctp_bridge',
        sourceChainId,
        sourceChainName: sourceChain.name,
        destinationChainId,
        destinationChainName: destChain.name,
        bridgeAmount: {
          raw: amount,
          formatted: formattedAmount,
          symbol: 'USDC',
        },
        transactions: [
          {
            step: 1,
            name: 'Approve USDC',
            description: `Allow CCTP TokenMessenger to burn your USDC on ${sourceChain.name}`,
            to: sourceUSDC,
            data: approveData,
            value: '0',
          },
          {
            step: 2,
            name: 'Bridge USDC',
            description: `Burn ${formattedAmount} USDC on ${sourceChain.name} — Circle will automatically mint on ${destChain.name}`,
            to: tokenMessenger,
            data: depositForBurnData,
            value: '0',
          },
        ],
        contracts: {
          tokenMessenger,
          sourceUSDC,
        },
        note: `After the burn transaction confirms, Circle's attestation service will automatically mint ${formattedAmount} USDC to your address on ${destChain.name}. This typically completes within a few minutes.`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to build CCTP bridge transaction';
      return {
        success: false,
        error: message,
      };
    }
  },
});

export const completeCCTPBridge = tool({
  description:
    'Complete a CCTP USDC bridge by relaying the attestation to the destination chain. Use after a depositForBurn transaction has confirmed. This fetches the attestation from Circle and builds a receiveMessage transaction to mint USDC on the destination chain. Use when the user says "complete my bridge", "relay my CCTP transfer", "mint my USDC on destination", or when a previous bridge burn succeeded but USDC hasn\'t arrived.',
  parameters: z.object({
    sourceTxHash: z.string().describe('The transaction hash of the depositForBurn transaction on the source chain'),
    sourceChainId: z.number().describe('The source chain ID where the burn happened (e.g., 11155111 = Sepolia)'),
  }),
  execute: async ({ sourceTxHash, sourceChainId }) => {
    try {
      // Get source domain from chain ID
      const sourceDomain = CCTP_DOMAINS[sourceChainId];
      if (sourceDomain === undefined) {
        return {
          success: false,
          error: `No CCTP domain for chain ${sourceChainId}`,
        };
      }

      const sourceChain = ARC_SUPPORTED_CHAINS[NETWORK].find(c => c.chainId === sourceChainId);

      // Fetch attestation from Circle's Iris API
      const attestationUrl = `${CCTP_ATTESTATION_API[NETWORK]}/${sourceDomain}?transactionHash=${sourceTxHash}`;
      const response = await fetch(attestationUrl);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Attestation API returned ${response.status}: ${errorText}`,
        };
      }

      const result = await response.json();
      const messages = result.messages;

      if (!messages || messages.length === 0) {
        return {
          success: false,
          status: 'not_found',
          error: 'No attestation found for this transaction yet. The burn may still be processing. Try again in a minute.',
        };
      }

      const msg = messages[0];

      if (msg.status !== 'complete') {
        return {
          success: false,
          status: msg.status,
          error: `Attestation is not ready yet (status: ${msg.status}). Try again in a minute.`,
        };
      }

      // Extract message and attestation bytes
      const messageBytes = msg.message;
      const attestationBytes = msg.attestation;

      if (!messageBytes || !attestationBytes) {
        return {
          success: false,
          error: 'Attestation is complete but message or attestation bytes are missing.',
        };
      }

      // Determine destination domain from Iris API response
      // Iris v2 nests it under decodedMessage.destinationDomain
      const destDomain: number | undefined =
        Number(msg.decodedMessage?.destinationDomain ?? msg.destinationDomain ?? msg.destination_domain);
      const destChainId = destDomain !== undefined ? DOMAIN_TO_CHAIN_ID[destDomain] : undefined;
      if (!destChainId) {
        return {
          success: false,
          error: `Unknown destination domain ${destDomain}. Cannot determine destination chain.`,
        };
      }

      const destChain = ARC_SUPPORTED_CHAINS[NETWORK].find(c => c.chainId === destChainId);
      const messageTransmitter = CCTP_MESSAGE_TRANSMITTER[destChainId];
      if (!messageTransmitter) {
        return {
          success: false,
          error: `No MessageTransmitter contract configured for destination chain ${destChainId}`,
        };
      }

      // Build receiveMessage transaction
      const receiveMessageData = encodeFunctionData({
        abi: MESSAGE_TRANSMITTER_ABI,
        functionName: 'receiveMessage',
        args: [messageBytes as `0x${string}`, attestationBytes as `0x${string}`],
      });

      // Extract amount from Iris API response
      // Iris v2 nests it under decodedMessage.decodedMessageBody.amount
      const rawAmount: string | undefined =
        (msg.decodedMessage?.decodedMessageBody?.amount ?? msg.amount)?.toString();
      const amount = rawAmount ? formatTokenAmount(rawAmount, 6) : 'unknown';

      return {
        success: true,
        type: 'cctp_relay',
        status: 'ready',
        sourceChainId,
        sourceChainName: sourceChain?.name || `Chain ${sourceChainId}`,
        destinationChainId: destChainId,
        destinationChainName: destChain?.name || `Chain ${destChainId}`,
        sourceTxHash,
        amount: {
          raw: rawAmount,
          formatted: amount,
          symbol: 'USDC',
        },
        transactions: [
          {
            step: 1,
            name: 'Complete Bridge',
            description: `Relay attestation to mint ${amount} USDC on ${destChain?.name || `Chain ${destChainId}`}`,
            to: messageTransmitter,
            data: receiveMessageData,
            value: '0',
            chainId: destChainId,
          },
        ],
        note: `This will submit Circle's attestation to the MessageTransmitter on ${destChain?.name || `Chain ${destChainId}`}, which will mint USDC directly to your wallet.`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to build CCTP relay transaction';
      return {
        success: false,
        error: message,
      };
    }
  },
});
