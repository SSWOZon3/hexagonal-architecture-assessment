import { DeliveryRepository } from '../../domain/repositories/DeliveryRepository';
import { Delivery, DeliveryStatus, Address, CustomerInfo } from '../../domain/entities/Delivery';
import { OrderId } from '../../domain/value-objects/OrderId';
import { ShippingProviderSelector } from '../ports/ShippingProviderSelector';
import { IdProvider } from '@application/ports/IdProvider';

export interface CreateDeliveryInput {
    orderId: string;
    shippingAddress: Address;
    customerInfo: CustomerInfo;
}

export interface DeliveryLabel {
    deliveryId: string;
    orderId: string;
    provider: string;
    labelUrl: string;
    trackingNumber: string;
    estimatedDelivery: Date;
    status: DeliveryStatus;
}

export class CreateDeliveryUseCase {
    constructor(
        private readonly deliveryRepository: DeliveryRepository,
        private readonly providerSelector: ShippingProviderSelector,
        private readonly idProvider: IdProvider,
    ) { }

    async execute(input: CreateDeliveryInput): Promise<DeliveryLabel> {
        const orderId = new OrderId(input.orderId);

        const existingDelivery = await this.deliveryRepository.findByOrderId(orderId);
        if (existingDelivery) {
            throw new Error(`Delivery already exists for order ${orderId.toString()}`);
        }

        const selectedProvider = this.providerSelector.selectProvider();

        const shippingLabel = await selectedProvider.generateLabel({
            orderId: orderId.toString(),
            shippingAddress: input.shippingAddress,
            customerInfo: input.customerInfo
        });

        const delivery = Delivery.create({
            id: this.idProvider.newDeliveryId(),
            orderId: orderId,
            provider: shippingLabel.provider,
            trackingNumber: shippingLabel.trackingNumber,
            status: DeliveryStatus.CONFIRMED,
            labelUrl: shippingLabel.labelUrl,
            shippingAddress: input.shippingAddress,
            customerInfo: input.customerInfo
        });

        await this.deliveryRepository.save(delivery);

        return {
            deliveryId: delivery.id.toString(),
            orderId: delivery.orderId.toString(),
            provider: delivery.provider,
            labelUrl: delivery.labelUrl,
            trackingNumber: delivery.trackingNumber,
            estimatedDelivery: shippingLabel.estimatedDelivery,
            status: delivery.status
        };
    }
}
