import { IdProvider } from '../../domain/ports/IdProvider';
import { DeliveryId } from '../../domain/value-objects/DeliveryId';
import { Types } from 'mongoose';

export class MongoObjectIdProvider implements IdProvider {
    newDeliveryId(): DeliveryId {
        const objectId = new Types.ObjectId();
        return DeliveryId.fromString(objectId.toHexString());
    }
}
