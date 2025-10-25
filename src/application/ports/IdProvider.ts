import { DeliveryId } from '../../domain/value-objects/DeliveryId';

export interface IdProvider {
    newDeliveryId(): DeliveryId;
}
