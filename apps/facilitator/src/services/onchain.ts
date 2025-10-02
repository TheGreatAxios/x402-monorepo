import {
	createPublicClient,
	createWalletClient,
	getContract,
	http
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, skaleEuropaTestnet } from "viem/chains";

type Address = `0x${string}`;

export type SupportedNetwork = "base-sepolia" | "skale-europa-testnet";

export interface RpcConfig {
	baseSepoliaUrl?: string;
	skaleEuropaTestnetUrl?: string;
}

export function getChainAndUrl(network: SupportedNetwork, rpc: RpcConfig) {
	if (network === "base-sepolia") {
		return { chain: baseSepolia, url: rpc.baseSepoliaUrl } as const;
	}
	if (network === "skale-europa-testnet") {
		return {
			chain: skaleEuropaTestnet,
			url: rpc.skaleEuropaTestnetUrl
		} as const;
	}
	throw new Error(`Unsupported network: ${network}`);
}

export function getClients(
	network: SupportedNetwork,
	rpc: RpcConfig,
	privateKey: string
) {
	const { chain, url } = getChainAndUrl(network, rpc);
	const transport = url ? http(url) : http();
	const publicClient = createPublicClient({ chain, transport });
	const walletClient = createWalletClient({
		chain,
		transport,
		account: privateKeyToAccount(privateKey as Address)
	});
	return { publicClient, walletClient } as const;
}

// Minimal ABI surfaces
const eip3009Abi = [
	{
		type: "function",
		name: "transferWithAuthorization",
		stateMutability: "nonpayable",
		inputs: [
			{ name: "from", type: "address" },
			{ name: "to", type: "address" },
			{ name: "value", type: "uint256" },
			{ name: "validAfter", type: "uint256" },
			{ name: "validBefore", type: "uint256" },
			{ name: "nonce", type: "uint256" },
			{ name: "signature", type: "bytes" }
		],
		outputs: []
	}
] as const;

// Assumption: Forwarder interface for EIP-3009-forwarder
const eip3009ForwarderAbi = [
	{
		type: "function",
		name: "transferWithAuthorization",
		stateMutability: "nonpayable",
		inputs: [
			{ name: "from", type: "address" },
			{ name: "to", type: "address" },
			{ name: "value", type: "uint256" },
			{ name: "validAfter", type: "uint256" },
			{ name: "validBefore", type: "uint256" },
			{ name: "nonce", type: "bytes32" },
			{ name: "v", type: "uint8" },
			{ name: "r", type: "bytes32" },
			{ name: "s", type: "bytes32" }
		],
		outputs: []
	}
] as const;

export async function settleEIP3009(
	network: SupportedNetwork,
	rpc: RpcConfig,
	privateKey: string,
	verifyingContract: Address,
	args: {
		from: Address;
		to: Address;
		value: bigint;
		validAfter: bigint;
		validBefore: bigint;
		nonce: bigint;
		signature: `0x${string}`;
	}
) {
	const { publicClient, walletClient } = getClients(network, rpc, privateKey);
	const contract = getContract({
		abi: eip3009Abi,
		address: verifyingContract,
		client: { public: publicClient, wallet: walletClient } as any
	});
	const { request } = await (
		contract as any
	).simulate.transferWithAuthorization(
		[
			args.from,
			args.to,
			args.value,
			args.validAfter,
			args.validBefore,
			args.nonce,
			args.signature
		],
		{ account: walletClient.account }
	);
	const txHash = await walletClient.writeContract(request);
	const receipt = await publicClient.waitForTransactionReceipt({
		hash: txHash
	});
	return { txHash, receipt };
}

export async function settleEIP3009Forwarder(
	network: SupportedNetwork,
	rpc: RpcConfig,
	privateKey: string,
	forwarder: Address,
	args: {
		from: Address;
		to: Address;
		value: bigint;
		validAfter: bigint;
		validBefore: bigint;
		nonce: `0x${string}`;
		signature: `0x${string}`;
	}
) {
	const { publicClient, walletClient } = getClients(network, rpc, privateKey);
	const contract = getContract({
		abi: eip3009ForwarderAbi,
		address: forwarder,
		client: { public: publicClient, wallet: walletClient } as any
	});

	// Extract v, r, s from signature
	const signature = args.signature.slice(2); // Remove 0x
	const r = `0x${signature.slice(0, 64)}` as `0x${string}`;
	const s = `0x${signature.slice(64, 128)}` as `0x${string}`;
	const v = parseInt(signature.slice(128, 130), 16);

	const { request } = await (
		contract as any
	).simulate.transferWithAuthorization(
		[
			args.from,
			args.to,
			args.value,
			args.validAfter,
			args.validBefore,
			args.nonce,
			v,
			r,
			s
		],
		{ account: walletClient.account }
	);
	const txHash = await walletClient.writeContract(request);
	const receipt = await publicClient.waitForTransactionReceipt({
		hash: txHash
	});
	return { txHash, receipt };
}
