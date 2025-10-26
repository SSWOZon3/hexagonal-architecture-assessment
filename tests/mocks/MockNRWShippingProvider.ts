import { ShippingProvider, ShippingLabel, ShippingRequest, TrackingStatus, ProviderType } from '../../src/application/ports/ShippingProvider';
import { DeliveryStatus } from '../../src/domain/entities/Delivery';

export class MockNRWShippingProvider implements ShippingProvider {
    getName(): string {
        return 'NRW';
    }

    async isAvailable(): Promise<boolean> {
        return true;
    }

    getProviderType(): ProviderType {
        return ProviderType.POLLING;
    }

    async generateLabel(request: ShippingRequest): Promise<ShippingLabel> {
        const trackingNumber = `NRW${request.orderId.replace('ORDER-', '')}`;
        const estimatedDelivery = new Date('2025-11-01T10:00:00.000Z');

        return {
            provider: this.getName(),
            trackingNumber,
            labelUrl: `https://api.nrw-shipping.com/labels/${trackingNumber}.pdf`,
            estimatedDelivery
        };
    }

    async getTrackingStatus(deliveryId: string): Promise<TrackingStatus> {
        return {
            deliveryId,
            status: DeliveryStatus.CONFIRMED,
            lastUpdated: new Date('2025-10-26T10:00:00.000Z'),
            provider: this.getName()
        };
    }
}