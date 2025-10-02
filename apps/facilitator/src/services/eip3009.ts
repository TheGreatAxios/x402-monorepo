// Dynamic viem import at call-time to avoid hard dependency during typecheck
type Address = `0x${string}`;
type Hex = `0x${string}`;

export interface EIP3009Auth {
	from: Address;
	to: Address;
	value: bigint;
	validAfter: bigint;
	validBefore: bigint;
	nonce: Hex;
	signature: Hex;
	chainId: number;
	verifyingContract: Address; // USDC token contract address
	tokenName?: string; // e.g. 'USD Coin'
	tokenVersion?: string; // e.g. '2'
}

export async function verifyEIP3009Authorization(
	auth: EIP3009Auth
): Promise<boolean> {
	const domain = {
		name: auth.tokenName ?? "USD Coin",
		version: auth.tokenVersion ?? "2",
		chainId: auth.chainId,
		verifyingContract: auth.verifyingContract
	} as const;

	const types = {
		TransferWithAuthorization: [
			{ name: "from", type: "address" },
			{ name: "to", type: "address" },
			{ name: "value", type: "uint256" },
			{ name: "validAfter", type: "uint256" },
			{ name: "validBefore", type: "uint256" },
			{ name: "nonce", type: "bytes32" }
		]
	} as const;

	const message = {
		from: auth.from,
		to: auth.to,
		value: auth.value,
		validAfter: auth.validAfter,
		validBefore: auth.validBefore,
		nonce: auth.nonce
	} as const;

	try {
		const viem = require("viem") as any;
		const ok = await viem.verifyTypedData({
			address: auth.from,
			domain,
			types,
			primaryType: "TransferWithAuthorization",
			message,
			signature: auth.signature
		});
		return ok;
	} catch (err) {
		console.error("EIP-3009 verify error:", err);
		return false;
	}
}

export interface EIP3009ForwarderAuth {
	from: Address;
	to: Address;
	value: bigint;
	validAfter: bigint;
	validBefore: bigint;
	nonce: Hex;
	signature: Hex;
	chainId: number;
	forwarderAddress: Address; // EIP3009Forwarder contract
	token: Address; // underlying USDC token address
	name?: string; // forwarder domain name, e.g. 'USDC Forwarder'
	version?: string; // forwarder version, e.g. '1'
}

export async function verifyEIP3009Forwarder(
	auth: EIP3009ForwarderAuth
): Promise<boolean> {
	const domain = {
		name: auth.name ?? "USDC Forwarder",
		version: auth.version ?? "1",
		chainId: auth.chainId,
		verifyingContract: auth.forwarderAddress
	} as const;

	const types = {
		TransferWithAuthorization: [
			{ name: "from", type: "address" },
			{ name: "to", type: "address" },
			{ name: "value", type: "uint256" },
			{ name: "validAfter", type: "uint256" },
			{ name: "validBefore", type: "uint256" },
			{ name: "nonce", type: "bytes32" }
		]
	} as const;

	const message = {
		from: auth.from,
		to: auth.to,
		value: auth.value,
		validAfter: auth.validAfter,
		validBefore: auth.validBefore,
		nonce: `0x${BigInt(auth.nonce).toString(16).padStart(64, "0")}`
	} as const;

	try {
		const viem = require("viem") as any;
		const ok = await viem.verifyTypedData({
			address: auth.from,
			domain,
			types,
			primaryType: "TransferWithAuthorization",
			message,
			signature: auth.signature
		});
		return ok;
	} catch (err) {
		console.error("EIP-3009 forwarder verify error:", err);
		return false;
	}
}
