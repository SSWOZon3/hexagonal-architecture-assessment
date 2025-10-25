import { DeliveryRepository } from '../../domain/repositories/DeliveryRepository';
import { ShippingProvider, ProviderType } from '../../application/ports/ShippingProvider';
import { UpdateDeliveryStatusUseCase } from '../../application/useCases/updateDeliveryStatus.useCase';
import { DeliveryStatus } from '../../domain/entities/Delivery';

export class DeliveryPollingService {
    private intervalId: NodeJS.Timeout | null = null;
    private readonly POLLING_INTERVAL = 60 * 1000; // 1 minute in milliseconds

    constructor(
        private readonly deliveryRepository: DeliveryRepository,
        private readonly shippingProviders: ShippingProvider[],
        private readonly updateDeliveryStatusUseCase: UpdateDeliveryStatusUseCase
    ) { }

    start(): void {
        if (this.intervalId) {
            console.log('Polling service is already running');
            return;
        }

        console.log('Starting delivery polling service...');
        this.intervalId = setInterval(() => {
            this.pollDeliveries().catch(error => {
                console.error('Error during delivery polling:', error);
            });
        }, this.POLLING_INTERVAL);

        // Run immediately on start
        this.pollDeliveries().catch(error => {
            console.error('Error during initial delivery polling:', error);
        });
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('Delivery polling service stopped');
        }
    }

    private async pollDeliveries(): Promise<void> {
        console.log('Polling deliveries for status updates...');

        const pollableDeliveryStatuses = [DeliveryStatus.PENDING, DeliveryStatus.CONFIRMED, DeliveryStatus.IN_TRANSIT];

        const deliveries = await this.deliveryRepository.findByStatus(pollableDeliveryStatuses);
        console.log(`Found ${deliveries.length} deliveries to poll`);

        for (const delivery of deliveries) {
            const provider = this.shippingProviders.find(p => p.getName() === delivery.provider);

            if (!provider || provider.getProviderType() !== ProviderType.POLLING || !provider.getTrackingStatus) {
                continue;
            }

            try {
                const trackingStatus = await provider.getTrackingStatus(delivery.trackingNumber);

                if (trackingStatus.status !== delivery.status) {
                    console.log(
                        `Updating delivery ${delivery.trackingNumber} status: ${delivery.status} -> ${trackingStatus.status}`
                    );

                    await this.updateDeliveryStatusUseCase.execute({
                        deliveryId: delivery.id,
                        status: trackingStatus.status
                    });
                } else {
                    console.log(`No status change for delivery ${delivery.trackingNumber}`);
                }

            } catch (error) {
                console.error(`Error polling delivery ${delivery.trackingNumber}:`, error);
            }
        }
    }
}