export interface X402PaymentHeader {
	amount: string;
	channelId: string;
	nonce: number;
	signature: string;
}

export interface PaymentChannel {
	id: string;
	sender: string;
	receiver: string;
	balance: bigint;
	withdrawn: bigint;
	nonce: number;
	expiresAt: number;
	createdAt: number;
}

export interface CreateChannelRequest {
	sender: string;
	receiver: string;
	initialDeposit: string;
	duration?: number; // in seconds, default 1 week
}

export interface PaymentRequest {
	channelId: string;
	amount: string;
	nonce: number;
	signature: string;
}

export interface SettlementRequest {
	channelId: string;
	finalAmount: string;
	nonce: number;
	signature: string;
}
