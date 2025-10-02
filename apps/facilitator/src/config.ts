import { cleanEnv, num, str } from "envalid";

const env = cleanEnv(process.env, {
	PORT: num({ default: 3000 }),
	HOST: str({ default: "0.0.0.0" }),
	MIN_PAYMENT_WEI: str({ default: "1000000000000000" }),
	MAX_PAYMENT_WEI: str({ default: "10000000000000000000" }),
	REDIS_URL: str({ default: "" }),
	RAVENDB_URL: str({ default: "" }),
	RAVENDB_DATABASE: str({ default: "" }),
	RAVENDB_CERT_PATH: str({ default: "" }),
	RAVENDB_CERT_PASSWORD: str({ default: "" }),
	EVM_SETTLEMENT_PRIVATE_KEY: str({ default: "" }),
	EVM_PRIVATE_KEY: str({ default: "" }),
	RPC_BASE_SEPOLIA_URL: str({ default: "" }),
	RPC_SKALE_EUROPA_TESTNET_URL: str({ default: "" })
});

export const runtime = {
	port: env.PORT,
	host: env.HOST,
	minPaymentAmount: env.MIN_PAYMENT_WEI,
	maxPaymentAmount: env.MAX_PAYMENT_WEI,
	redisUrl: env.REDIS_URL,
	ravendbUrl: env.RAVENDB_URL,
	ravendbDatabase: env.RAVENDB_DATABASE,
	ravendbCertPath: env.RAVENDB_CERT_PATH,
	ravendbCertPassword: env.RAVENDB_CERT_PASSWORD,
	evmSettlementPrivateKey:
		env.EVM_SETTLEMENT_PRIVATE_KEY || env.EVM_PRIVATE_KEY,
	rpc: {
		baseSepoliaUrl: env.RPC_BASE_SEPOLIA_URL,
		skaleEuropaTestnetUrl: env.RPC_SKALE_EUROPA_TESTNET_URL
	}
};
