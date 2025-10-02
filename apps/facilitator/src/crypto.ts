export function generateChannelId(sender: string, receiver: string, nonce: string): string {
  // dynamic import viem
  // @ts-ignore
  const viem = require('viem') as any;
  // Solidity-packed keccak256 of (address,address,string)
  const packed = viem.concat([
    // Addresses are 20 bytes already when hex decoded
    viem.hexToBytes(sender as `0x${string}`),
    viem.hexToBytes(receiver as `0x${string}`),
    viem.stringToBytes(nonce),
  ]);
  return viem.keccak256(packed);
}

export function verifySignature(
  channelId: string,
  amount: string,
  nonce: number,
  signature: string,
  expectedSigner: string
): boolean {
  try {
    // @ts-ignore
    const viem = require('viem') as any;
    // Pack and hash similar to original
    const packed = viem.concat([
      viem.hexToBytes(channelId as `0x${string}`),
      viem.toBytes(BigInt(amount)),
      viem.toBytes(BigInt(nonce)),
    ]);
    const messageHash = viem.keccak256(packed);
    const recovered = viem.recoverAddress({ hash: viem.hashMessage(messageHash), signature: signature as `0x${string}` });
    return recovered.toLowerCase() === expectedSigner.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export function isValidEthereumAddress(address: string): boolean {
  try {
    // @ts-ignore
    const viem = require('viem') as any;
    return viem.isAddress(address);
  } catch { return false; }
}
