import { ShippingProvider, ShippingLabel, ShippingRequest, ProviderType, TrackingStatus } from '../../../application/ports/ShippingProvider';
import { DeliveryStatus } from '../../../domain/entities/Delivery';

export class NRWShippingProvider implements ShippingProvider {
    getName(): string {
        return 'NRW';
    }

    async isAvailable(): Promise<boolean> {
        await this.APIDelay();
        return Math.random() > 0.1; // 90% availability
    }

    getProviderType(): ProviderType {
        return ProviderType.POLLING;
    }

    async generateLabel(request: ShippingRequest): Promise<ShippingLabel> {
        await this.APIDelay();

        if (Math.random() < 0.05) { // 5% failure rate
            throw new Error('NRW API temporarily unavailable');
        }

        const trackingNumber = `NRW${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 2 + Math.floor(Math.random() * 3)); // 2-4 days

        return {
            provider: this.getName(),
            trackingNumber,
            labelUrl: `https://api.nrw-shipping.com/labels/${trackingNumber}.pdf`,
            estimatedDelivery
        };
    }

    async getTrackingStatus(deliveryId: string): Promise<TrackingStatus> {
        await this.APIDelay();

        if (Math.random() < 0.02) { // 2% failure rate
            throw new Error('NRW tracking API temporarily unavailable');
        }

        // Higher probability for later statuses as time progresses
        const randomValue = Math.random();
        let status: DeliveryStatus;

        if (randomValue < 0.3) {
            status = DeliveryStatus.CONFIRMED;
        } else if (randomValue < 0.7) {
            status = DeliveryStatus.IN_TRANSIT;
        } else {
            status = DeliveryStatus.DELIVERED;
        }

        return {
            deliveryId,
            status,
            lastUpdated: new Date(),
            provider: this.getName()
        };
    }

    private APIDelay(): Promise<void> {
        const ms = 10 + Math.random() * 200; // 10-200ms
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
