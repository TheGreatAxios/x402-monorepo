export const config = {
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || '0.0.0.0',
  defaultChannelDuration: 7 * 24 * 60 * 60, // 1 week in seconds
  minPaymentAmount: '1000000000000000', // 0.001 ETH in wei
  maxPaymentAmount: '10000000000000000000', // 10 ETH in wei
};
