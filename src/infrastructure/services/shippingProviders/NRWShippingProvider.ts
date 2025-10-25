// src/infrastructure/adapters/NRWShippingProvider.ts
import { ShippingProvider, ShippingLabel, ShippingRequest, ProviderType, TrackingStatus } from '../../../domain/ports/ShippingProvider';
import { DeliveryStatus } from '../../../domain/entities/Delivery';

export class NRWShippingProvider implements ShippingProvider {
    getName(): string {
        return 'NRW';
    }

    isAvailable(): boolean {
        // Simulate random availability
        return Math.random() > 0.1; // 90% availability
    }

    getProviderType(): ProviderType {
        return ProviderType.POLLING;
    }

    async generateLabel(request: ShippingRequest): Promise<ShippingLabel> {
        // Simulate API call delay
        await this.delay(100 + Math.random() * 200);

        // Simulate potential API failure
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
        // Simulate API call delay for polling
        await this.delay(50 + Math.random() * 100);

        // Simulate potential API failure
        if (Math.random() < 0.02) { // 2% failure rate
            throw new Error('NRW tracking API temporarily unavailable');
        }

        // Simulate realistic status progression
        const statusOptions: DeliveryStatus[] = [
            DeliveryStatus.CONFIRMED,
            DeliveryStatus.IN_TRANSIT,
            DeliveryStatus.DELIVERED
        ];

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

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
