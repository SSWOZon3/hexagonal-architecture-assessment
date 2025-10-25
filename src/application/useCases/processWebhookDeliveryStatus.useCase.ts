import { DeliveryRepository } from '../../domain/repositories/DeliveryRepository';
import { UpdateDeliveryStatusUseCase } from './updateDeliveryStatus.useCase';
import { DeliveryStatus } from '../../domain/entities/Delivery';

export interface ProcessWebhookDeliveryStatusInput {
    trackingNumber: string;
    status: string;
    timestamp: string;
    signature?: string;
}

export interface ProcessWebhookDeliveryStatusOutput {
    deliveryId: string;
    orderId: string;
    trackingNumber: string;
    provider: string;
    previousStatus: DeliveryStatus;
    newStatus: DeliveryStatus;
}

export class ProcessWebhookDeliveryStatusUseCase {
    constructor(
        private readonly deliveryRepository: DeliveryRepository,
        private readonly updateDeliveryStatusUseCase: UpdateDeliveryStatusUseCase
    ) { }

    async execute(input: ProcessWebhookDeliveryStatusInput): Promise<ProcessWebhookDeliveryStatusOutput> {
        const delivery = await this.deliveryRepository.findByTrackingNumber(input.trackingNumber);
        if (!delivery) {
            throw new DeliveryNotFoundError(`Delivery with tracking number ${input.trackingNumber} not found`);
        }

        // TODO: this would be a translation from provider-specific status to our internal status
        if (!Object.values(DeliveryStatus).includes(input.status as DeliveryStatus)) {
            throw new InvalidDeliveryStatusError(`Invalid delivery status: ${input.status}`);
        }

        const newStatus = input.status as DeliveryStatus;
        const previousStatus = delivery.status;

        // TODO: Policy - Business rule: Only update if status actually changed
        if (previousStatus === newStatus) {
            throw new NoStatusChangeError(`Delivery ${input.trackingNumber} already has status ${newStatus}`);
        }

        await this.updateDeliveryStatusUseCase.execute({
            deliveryId: delivery.id,
            status: newStatus
        });

        return {
            deliveryId: delivery.id.toString(),
            orderId: delivery.orderId.toString(),
            trackingNumber: input.trackingNumber,
            provider: delivery.provider,
            previousStatus,
            newStatus
        };
    }
}

// Domain/Application errors
export class DeliveryNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DeliveryNotFoundError';
    }
}

export class InvalidDeliveryStatusError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidDeliveryStatusError';
    }
}

export class NoStatusChangeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NoStatusChangeError';
    }
}

export class InvalidSignatureError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidSignatureError';
    }
}