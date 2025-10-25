import { DeliveryId } from '../value-objects/DeliveryId';

export interface IdProvider {
    newDeliveryId(): DeliveryId;
}
