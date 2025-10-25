// src/domain/repositories/DeliveryRepository.ts
import { Delivery, DeliveryStatus } from '../entities/Delivery';
import { DeliveryId } from '../value-objects/DeliveryId';
import { OrderId } from '../value-objects/OrderId';

export interface DeliveryRepository {
    save(delivery: Delivery): Promise<void>;
    findById(id: DeliveryId): Promise<Delivery | null>;
    findByOrderId(orderId: OrderId): Promise<Delivery | null>;
    findAll(): Promise<Delivery[]>;
    findByStatus(statuses: DeliveryStatus[]): Promise<Delivery[]>;
}
