import { ProviderType } from "../ports/ShippingProvider";
import { ShippingProviderSelector } from "../ports/ShippingProviderSelector";
import { DeliveryStatus } from "../../domain/entities/Delivery";
import { DeliveryRepository } from "../../domain/repositories/DeliveryRepository";
import { UpdateDeliveryStatusUseCase } from "./updateDeliveryStatus.useCase";

export class SyncTrackingStatusesUseCase {
    constructor(
        private readonly deliveryRepo: DeliveryRepository,
        private readonly updateDeliveryStatus: UpdateDeliveryStatusUseCase,
        private readonly providerSelector: ShippingProviderSelector,
    ) { }

    async execute(): Promise<void> {
        const pollableDeliveryStatuses = [DeliveryStatus.PENDING, DeliveryStatus.CONFIRMED, DeliveryStatus.IN_TRANSIT];
        // TODO: Create repository call to find deliveries by status and provider type
        const deliveries = await this.deliveryRepo.findByStatus(pollableDeliveryStatuses);

        const shippingProviders = this.providerSelector.getAllProviders();

        for (const delivery of deliveries) {
            const provider = shippingProviders.find(p => p.getName() === delivery.provider);

            if (!provider || provider.getProviderType() !== ProviderType.POLLING || !provider.getTrackingStatus) {
                continue;
            }

            try {
                const trackingStatus = await provider.getTrackingStatus(delivery.trackingNumber);

                if (trackingStatus.status !== delivery.status) {
                    await this.updateDeliveryStatus.execute({
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
