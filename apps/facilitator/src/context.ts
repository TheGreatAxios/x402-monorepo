export interface X402PaymentInfo {
  channelId: string;
  amount: string;
  nonce: number;
  withdrawn: string;
  remaining: string;
}

export type AppVariables = {
  x402Payment?: X402PaymentInfo;
};
