import { ethers } from 'ethers';

export function generateChannelId(sender: string, receiver: string, nonce: string): string {
  const hash = ethers.solidityPackedKeccak256(
    ['address', 'address', 'string'],
    [sender, receiver, nonce]
  );
  return hash;
}

export function verifySignature(
  channelId: string,
  amount: string,
  nonce: number,
  signature: string,
  expectedSigner: string
): boolean {
  try {
    // Create the message hash
    const messageHash = ethers.solidityPackedKeccak256(
      ['bytes32', 'uint256', 'uint256'],
      [channelId, amount, nonce]
    );

    // Recover the signer from the signature
    const recoveredAddress = ethers.verifyMessage(
      ethers.getBytes(messageHash),
      signature
    );

    // Compare addresses (case-insensitive)
    return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export function isValidEthereumAddress(address: string): boolean {
  return ethers.isAddress(address);
}
