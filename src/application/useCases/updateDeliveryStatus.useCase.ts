import { DeliveryRepository } from '../../domain/repositories/DeliveryRepository';
import { DeliveryId } from '../../domain/value-objects/DeliveryId';
import { DeliveryStatus } from '../../domain/entities/Delivery';

export interface UpdateDeliveryStatusInput {
    deliveryId: DeliveryId;
    status: DeliveryStatus;
}

export interface UpdateDeliveryStatusOutput {
    deliveryId: string;
    previousStatus: DeliveryStatus;
    newStatus: DeliveryStatus;
    updatedAt: Date;
}

export class UpdateDeliveryStatusUseCase {
    constructor(private readonly deliveryRepository: DeliveryRepository) { }

    async execute(input: UpdateDeliveryStatusInput): Promise<UpdateDeliveryStatusOutput> {
        const delivery = await this.deliveryRepository.findById(input.deliveryId);

        if (!delivery) {
            throw new Error(`Delivery with id ${input.deliveryId} not found`);
        }

        const previousStatus = delivery.status;

        delivery.updateStatus(input.status);

        await this.deliveryRepository.save(delivery);

        return {
            deliveryId: delivery.id.toString(),
            previousStatus,
            newStatus: delivery.status,
            updatedAt: delivery.updatedAt
        };
    }
}