import { ShippingProvider, ShippingLabel, ShippingRequest, ProviderType } from '../../src/application/ports/ShippingProvider';

export class MockTLSShippingProvider implements ShippingProvider {
    getName(): string {
        return 'TLS';
    }

    async isAvailable(): Promise<boolean> {
        return true;
    }

    getProviderType(): ProviderType {
        return ProviderType.WEBHOOK;
    }

    async generateLabel(request: ShippingRequest): Promise<ShippingLabel> {
        const trackingNumber = `TLS${request.orderId.replace('ORDER-', '')}`;
        const estimatedDelivery = new Date('2025-11-02T14:00:00.000Z');

        return {
            provider: this.getName(),
            trackingNumber,
            labelUrl: `https://api.tls-logistics.com/shipping-labels/${trackingNumber}.pdf`,
            estimatedDelivery
        };
    }
}