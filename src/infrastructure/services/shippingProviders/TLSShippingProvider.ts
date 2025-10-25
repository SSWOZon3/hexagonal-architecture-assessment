// src/infrastructure/adapters/TLSShippingProvider.ts
import { ShippingProvider, ShippingLabel, ShippingRequest, ProviderType } from '../../../domain/ports/ShippingProvider';

export class TLSShippingProvider implements ShippingProvider {
    getName(): string {
        return 'TLS';
    }

    isAvailable(): boolean {
        // Simulate random availability
        return Math.random() > 0.15; // 85% availability
    }

    getProviderType(): ProviderType {
        return ProviderType.WEBHOOK;
    }

    async generateLabel(request: ShippingRequest): Promise<ShippingLabel> {
        // Simulate API call delay
        await this.delay(150 + Math.random() * 300);

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

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}