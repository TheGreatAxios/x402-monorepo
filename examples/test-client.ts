import { ethers } from 'ethers';

// Example test client for x402 Facilitator
// This demonstrates how to interact with the facilitator

const FACILITATOR_URL = 'http://localhost:3000';

// Generate a test wallet
const wallet = ethers.Wallet.createRandom();
console.log('Test Wallet Address:', wallet.address);

// Receiver address
const receiver = '0x5aeda56215b167893e80b4fe645ba6d5bab767de';

async function createChannel() {
  console.log('\n=== Creating Payment Channel ===');
  
  const channelData = {
    sender: wallet.address,
    receiver: receiver,
    initialDeposit: '1000000000000000000', // 1 ETH in wei
    duration: 86400, // 1 day
  };

  const response = await fetch(`${FACILITATOR_URL}/api/channels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(channelData),
  });

  const result = (await response.json()) as any;
  console.log('Channel created:', result);
  return result.channel;
}

async function signPayment(channelId: string, amount: string, nonce: number) {
  console.log('\n=== Signing Payment ===');
  
  // Create message hash (same as in the server)
  const messageHash = ethers.solidityPackedKeccak256(
    ['bytes32', 'uint256', 'uint256'],
    [channelId, amount, nonce]
  );

  // Sign the message
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));
  
  console.log('Signature:', signature);
  return signature;
}

async function makePayment(channelId: string, amount: string, nonce: number) {
  console.log('\n=== Making Payment ===');
  
  const signature = await signPayment(channelId, amount, nonce);
  
  const paymentData = {
    channelId,
    amount,
    nonce,
    signature,
  };

  const response = await fetch(`${FACILITATOR_URL}/api/channels/${channelId}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData),
  });

  const result = (await response.json()) as any;
  console.log('Payment result:', result);
  return result;
}

async function accessProtectedContent(channelId: string, amount: string, nonce: number) {
  console.log('\n=== Accessing Protected Content with X-402 Header ===');
  
  const signature = await signPayment(channelId, amount, nonce);
  
  const x402Header = JSON.stringify({
    channelId,
    amount,
    nonce,
    signature,
  });

  const response = await fetch(`${FACILITATOR_URL}/api/content`, {
    method: 'GET',
    headers: { 'X-402': x402Header },
  });

  const result = (await response.json()) as any;
  console.log('Protected content:', result);
  return result;
}

async function settleChannel(channelId: string, finalAmount: string, nonce: number) {
  console.log('\n=== Settling Channel ===');
  
  const signature = await signPayment(channelId, finalAmount, nonce);
  
  const settlementData = {
    channelId,
    finalAmount,
    nonce,
    signature,
  };

  const response = await fetch(`${FACILITATOR_URL}/api/channels/${channelId}/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settlementData),
  });

  const result = (await response.json()) as any;
  console.log('Settlement result:', result);
  return result;
}

async function main() {
  try {
    console.log('=================================');
    console.log('x402 Facilitator Test Client');
    console.log('=================================');

    // Create a payment channel
    const channel = await createChannel();
    const channelId = channel.id;

    // Make a payment (0.01 ETH)
    await makePayment(channelId, '10000000000000000', 1);

    // Make another payment (0.02 ETH)
    await makePayment(channelId, '20000000000000000', 2);

    // Access protected content with X-402 header (0.001 ETH)
    await accessProtectedContent(channelId, '1000000000000000', 3);

    // Settle the channel with final amount (0.031 ETH total)
    await settleChannel(channelId, '31000000000000000', 4);

    console.log('\n=== Test Complete ===');
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
