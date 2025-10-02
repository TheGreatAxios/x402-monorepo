import { DocumentStore, type IDocumentStore } from "ravendb";

export function createRavenStore(
	url: string,
	database: string,
	cert?: { certificate?: Buffer; password?: string }
): IDocumentStore {
	const store = new DocumentStore(url, database);
	if (cert?.certificate) {
		// @ts-ignore types vary by env
		store.authOptions = {
			certificate: cert.certificate,
			password: cert.password,
			type: "pem"
		} as any;
	}
	store.initialize();
	return store;
}
