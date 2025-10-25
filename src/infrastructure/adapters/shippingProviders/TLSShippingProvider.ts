// src/infrastructure/adapters/TLSShippingProvider.ts
import { ShippingProvider, ShippingLabel, ShippingRequest, ProviderType } from '../../../application/ports/ShippingProvider';

export class TLSShippingProvider implements ShippingProvider {
    getName(): string {
        return 'TLS';
    }

    async isAvailable(): Promise<boolean> {
        await this.APIDelay();
        return Math.random() > 0.15; // 85% availability
    }

    getProviderType(): ProviderType {
        return ProviderType.WEBHOOK;
    }

    async generateLabel(request: ShippingRequest): Promise<ShippingLabel> {
        await this.APIDelay();

        // Simulate potential API failure
        if (Math.random() < 0.08) { // 8% failure rate
            throw new Error('TLS API temporarily unavailable');
        }

        const trackingNumber = `TLS${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 1 + Math.floor(Math.random() * 4)); // 1-4 days

        return {
            provider: this.getName(),
            trackingNumber,
            labelUrl: `https://api.tls-logistics.com/shipping-labels/${trackingNumber}.pdf`,
            estimatedDelivery
        };
    }

    private APIDelay(): Promise<void> {
        const ms = 10 + Math.random() * 200;
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}