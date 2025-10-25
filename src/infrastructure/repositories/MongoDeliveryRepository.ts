// src/infrastructure/repositories/MongoDeliveryRepository.ts
import { DeliveryRepository } from '../../domain/repositories/DeliveryRepository';
import { Delivery } from '../../domain/entities/Delivery';
import { DeliveryId } from '../../domain/value-objects/DeliveryId';
import { OrderId } from '../../domain/value-objects/OrderId';
import { DeliveryModel, DeliveryDocument } from '../db/mongo/schemas/DeliverySchema';

export class MongoDeliveryRepository implements DeliveryRepository {
    async save(delivery: Delivery): Promise<void> {
        const deliveryData = delivery.toPrimitives();

        try {
            await DeliveryModel.create({
                id: deliveryData.id,
                orderId: deliveryData.orderId,
                provider: deliveryData.provider,
                status: deliveryData.status,
                labelUrl: deliveryData.labelUrl,
                shippingAddress: deliveryData.shippingAddress,
                customerInfo: deliveryData.customerInfo,
                createdAt: deliveryData.createdAt,
                updatedAt: deliveryData.updatedAt
            });
        } catch (error: any) {
            if (error.code === 11000) {
                // Duplicate key error - update existing record
                await DeliveryModel.updateOne(
                    { orderId: deliveryData.orderId },
                    {
                        $set: {
                            provider: deliveryData.provider,
                            status: deliveryData.status,
                            labelUrl: deliveryData.labelUrl,
                            shippingAddress: deliveryData.shippingAddress,
                            customerInfo: deliveryData.customerInfo,
                            updatedAt: deliveryData.updatedAt
                        }
                    }
                );
            } else {
                throw error;
            }
        }
    }

    async findById(id: DeliveryId): Promise<Delivery | null> {
        const deliveryDoc = await DeliveryModel.findOne({ id: id.toString() }).exec();
        return deliveryDoc ? this.toDomainEntity(deliveryDoc) : null;
    }

    async findByOrderId(orderId: OrderId): Promise<Delivery | null> {
        const deliveryDoc = await DeliveryModel.findOne({ orderId: orderId.toString() }).exec();
        return deliveryDoc ? this.toDomainEntity(deliveryDoc) : null;
    }

    async findAll(): Promise<Delivery[]> {
        const deliveryDocs = await DeliveryModel.find().exec();
        return deliveryDocs.map(doc => this.toDomainEntity(doc));
    }

    async findByStatus(statuses: import('../../domain/entities/Delivery').DeliveryStatus[]): Promise<Delivery[]> {
        const deliveryDocs = await DeliveryModel.find({
            status: { $in: statuses }
        }).exec();
        return deliveryDocs.map(doc => this.toDomainEntity(doc));
    }

    private toDomainEntity(deliveryDoc: DeliveryDocument): Delivery {
        return Delivery.fromPrimitives({
            id: deliveryDoc.id,
            orderId: deliveryDoc.orderId,
            provider: deliveryDoc.provider,
            status: deliveryDoc.status,
            labelUrl: deliveryDoc.labelUrl,
            shippingAddress: deliveryDoc.shippingAddress,
            customerInfo: deliveryDoc.customerInfo,
            createdAt: deliveryDoc.createdAt,
            updatedAt: deliveryDoc.updatedAt
        });
    }
}