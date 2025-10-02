import type { PaymentChannel } from "./types";

// In-memory storage for payment channels
// In production, this should be replaced with a persistent database
export class ChannelStorage {
	private channels: Map<string, PaymentChannel> = new Map();

	createChannel(channel: PaymentChannel): void {
		this.channels.set(channel.id, channel);
	}

	getChannel(channelId: string): PaymentChannel | undefined {
		return this.channels.get(channelId);
	}

	updateChannel(
		channelId: string,
		updates: Partial<PaymentChannel>
	): boolean {
		const channel = this.channels.get(channelId);
		if (!channel) {
			return false;
		}
		this.channels.set(channelId, { ...channel, ...updates });
		return true;
	}

	deleteChannel(channelId: string): boolean {
		return this.channels.delete(channelId);
	}

	listChannels(): PaymentChannel[] {
		return Array.from(this.channels.values());
	}

	getChannelsBySender(sender: string): PaymentChannel[] {
		return Array.from(this.channels.values()).filter(
			(ch) => ch.sender.toLowerCase() === sender.toLowerCase()
		);
	}

	getChannelsByReceiver(receiver: string): PaymentChannel[] {
		return Array.from(this.channels.values()).filter(
			(ch) => ch.receiver.toLowerCase() === receiver.toLowerCase()
		);
	}
}

export const channelStorage = new ChannelStorage();
