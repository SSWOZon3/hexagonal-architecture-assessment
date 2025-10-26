import { Schema, model, Document } from 'mongoose';
import { DeliveryStatus } from '../../../../domain/entities/Delivery';

export interface DeliveryDocument extends Document {
    id: string;
    orderId: string;
    provider: string;
    trackingNumber: string;
    status: DeliveryStatus;
    labelUrl: string;
    shippingAddress: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    customerInfo: {
        name: string;
        email: string;
        phone: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const deliverySchema = new Schema<DeliveryDocument>({
    id: {
        type: String,
        required: true,
        unique: true
    },
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    provider: {
        type: String,
        required: true,
        enum: ['NRW', 'TLS']
    },
    trackingNumber: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        required: true,
        enum: Object.values(DeliveryStatus),
        default: DeliveryStatus.PENDING
    },
    labelUrl: {
        type: String,
        required: true
    },
    shippingAddress: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zipCode: { type: String, required: true },
        country: { type: String, required: true }
    },
    customerInfo: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true }
    }
}, {
    timestamps: true,
    collection: 'deliveries'
});

deliverySchema.index({ orderId: 1 });
deliverySchema.index({ status: 1 });
deliverySchema.index({ trackingNumber: 1 });

export const DeliveryModel = model<DeliveryDocument>('Delivery', deliverySchema);