import { DeliveryRepository } from '../../domain/repositories/DeliveryRepository';
import { DeliveryId } from '../../domain/value-objects/DeliveryId';
import { Delivery, DeliveryStatus } from '../../domain/entities/Delivery';

export interface GetDeliveryStatusInput {
    deliveryId: string;
}

export interface GetDeliveryStatusOutput {
    deliveryId: string;
    orderId: string;
    provider: string;
    status: DeliveryStatus;
    labelUrl: string;
    createdAt: Date;
    updatedAt: Date;
}

export class GetDeliveryStatusUseCase {
    constructor(private readonly deliveryRepository: DeliveryRepository) { }

    async execute(input: GetDeliveryStatusInput): Promise<GetDeliveryStatusOutput> {
        const deliveryId = DeliveryId.fromString(input.deliveryId);

        const delivery = await this.deliveryRepository.findById(deliveryId);

        if (!delivery) {
            throw new Error(`Delivery with id ${input.deliveryId} not found`);
        }

        return {
            deliveryId: delivery.id.toString(),
            orderId: delivery.orderId.toString(),
            provider: delivery.provider,
            status: delivery.status,
            labelUrl: delivery.labelUrl,
            createdAt: delivery.createdAt,
            updatedAt: delivery.updatedAt
        };
    }
}
