import { createPublicClient, createWalletClient, http, getAddress, isHex, parseUnits, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { skaleEuropaTestnet } from 'viem/chains';
import crypto from "node:crypto";

const USDC_TOKEN_ADDRESS = '0x9eAb55199f4481eCD7659540A17Af618766b07C4' as const;
const FORWARDER_ADDRESS = '0x7779B0d1766e6305E5f8081E3C0CDF58FcA24330' as const;

// ERC-20 ABI for approve and allowance functions
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'nonces',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const;

async function ensureApproval(
  publicClient: any,
  walletClient: any,
  account: any,
  tokenAddress: string
) {
  const requiredAmount = parseUnits('100', 6); // 100 USDC (6 decimals)
  
  console.log(`Checking USDC allowance for forwarder...`);
  
  const currentAllowance = await publicClient.readContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [account.address, FORWARDER_ADDRESS]
  });
  
  console.log(`Current allowance: ${currentAllowance}`);
  console.log(`Required amount: ${requiredAmount}`);
  
  if (currentAllowance < requiredAmount) {
    console.log('Insufficient allowance, approving...');
    
    const hash = await walletClient.writeContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [FORWARDER_ADDRESS, requiredAmount]
    });
    
    console.log(`Approval transaction hash: ${hash}`);
    
    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash });
    console.log('Approval confirmed');
  } else {
    console.log('Sufficient allowance already exists');
  }
}

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || !isHex(privateKey)) {
    throw new Error('PRIVATE_KEY environment variable is required and must be a valid hex string');
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`);

  console.log('Account address:', account.address);
  console.log('USDC token address:', USDC_TOKEN_ADDRESS);
  console.log('Forwarder address:', FORWARDER_ADDRESS);

  const publicClient = createPublicClient({
    chain: skaleEuropaTestnet,
    transport: http()
  });

  const walletClient = createWalletClient({
    account,
    chain: skaleEuropaTestnet,
    transport: http()
  });

  // Ensure sufficient USDC allowance for the forwarder contract
  await ensureApproval(publicClient, walletClient, account, USDC_TOKEN_ADDRESS);

  // Make the initial request to trigger payment
  console.log('Making request to trigger payment...');
  const response = await fetch('http://localhost:4021/weather?lat=32.7&lng=-96.8');
  console.log('Status:', response.status);
  
  if (response.status === 402) {
    const paymentInstructions = await response.json() as {
      error: string;
      instructions: {
        version: string;
        network: string;
        asset: string;
        scheme: string;
        price: string;
        receiver: string;
        facilitator: string;
        timeout: number;
        resource: string;
        description: string;
        extra: {
          name: string;
          verifyingContract: string;
          version: string;
          method: string;
          token: string;
        };
      };
    };
    console.log('Payment Instructions:', JSON.stringify(paymentInstructions, null, 2));
    
    // Construct the payment signature for EIP-3009-forwarder
    const { scheme, receiver: destination, asset, price: amount, extra } = paymentInstructions.instructions;
    
    if (extra.method === 'eip3009-forwarder') {
      console.log('Constructing EIP-3009-forwarder payment...');
      
      // Generate a simple random nonce as a number, not a huge hex string
      const nonce = Math.floor(Math.random() * 1000000000) + Date.now();
      
      const domain = {
        name: extra.name, // "USDC Forwarder"
        version: extra.version, // "1"
        chainId: skaleEuropaTestnet.id,
        verifyingContract: extra.verifyingContract as `0x${string}` // Forwarder contract
      };
      
      const message = {
        from: account.address,
        to: destination as `0x${string}`,
        value: BigInt(amount),
        validAfter: 0n,
        validBefore: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
        nonce: `0x${nonce.toString(16).padStart(64, '0')}` as `0x${string}` // Convert nonce to bytes32
      };
      
      const types = {
        TransferWithAuthorization: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce', type: 'bytes32' }
        ]
      };
      
      console.log('Signing typed data...');
      console.log('Domain:', domain);
      console.log('Message:', message);
      
      const signature = await account.signTypedData({
        domain,
        types,
        primaryType: 'TransferWithAuthorization',
        message
      });
      
      console.log('Signature:', signature);
      
      // Prepare the payment header with full EIP-3009-forwarder payload
      const paymentData = {
        type: 'eip3009-forwarder',
        from: account.address,
        to: destination,
        value: amount,
        validAfter: message.validAfter.toString(),
        validBefore: message.validBefore.toString(),
        nonce: message.nonce, // Send nonce as hex string
        signature,
        chainId: skaleEuropaTestnet.id,
        forwarderAddress: extra.verifyingContract,
        token: extra.token,
        name: extra.name,
        version: extra.version,
      };
      
      console.log('Payment Data:', JSON.stringify(paymentData, null, 2));
      
      // Retry the request with payment
      console.log('Retrying request with payment...');
      const retryResponse = await fetch('http://localhost:4021/weather?lat=32.7&lng=-96.8', {
        headers: {
          'X-PAYMENT': JSON.stringify(paymentData)
        }
      });
      
      console.log('Retry Status:', retryResponse.status);
      if (retryResponse.ok) {
        const result = await retryResponse.text();
        console.log('Success! Response:', result);
        
        // Now settle the payment on-chain
        console.log('Settling payment on-chain...');
        const settleResponse = await fetch('http://localhost:3000/settle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(paymentData)
        });
        
        console.log('Settlement Status:', settleResponse.status);
        if (settleResponse.ok) {
          const settlementResult = await settleResponse.json() as { success: boolean; txHash?: string; error?: string };
          console.log('Settlement Success!', settlementResult);
          if (settlementResult.txHash) {
            console.log('Transaction Hash:', settlementResult.txHash);
          }
        } else {
          const settlementError = await settleResponse.text();
          console.log('Settlement failed:', settlementError);
        }
      } else {
        const error = await retryResponse.text();
        console.log('Payment failed:', error);
      }
    } else {
      console.log('Unsupported payment method:', extra.method);
    }
  } else {
    console.log('No payment required or unexpected status');
    const result = await response.text();
    console.log('Response:', result);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
