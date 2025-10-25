import { Address, CustomerInfo, DeliveryStatus } from '../../domain/entities/Delivery';

export interface ShippingLabel {
    provider: string;
    trackingNumber: string;
    labelUrl: string;
    estimatedDelivery: Date;
}

export interface ShippingRequest {
    orderId: string;
    shippingAddress: Address;
    customerInfo: CustomerInfo;
}

export interface TrackingStatus {
    deliveryId: string;
    status: DeliveryStatus;
    lastUpdated: Date;
    provider: string;
}

export enum ProviderType {
    POLLING = 'POLLING',
    WEBHOOK = 'WEBHOOK'
}

export interface ShippingProvider {
    getName(): string;
    generateLabel(request: ShippingRequest): Promise<ShippingLabel>;
    isAvailable(): Promise<boolean>;
    getProviderType(): ProviderType;
    getTrackingStatus?(deliveryId: string): Promise<TrackingStatus>;
}
