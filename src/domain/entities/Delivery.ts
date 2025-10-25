// src/domain/entities/Delivery.ts
import { v4 as uuidv4 } from 'uuid';
import { DeliveryId } from '../value-objects/DeliveryId';
import { OrderId } from '../value-objects/OrderId';
import { IdProvider } from '../../application/ports/IdProvider';

export interface DeliveryProps {
    id: DeliveryId;
    orderId: OrderId;
    provider: string;
    trackingNumber: string;
    status: DeliveryStatus;
    labelUrl: string;
    shippingAddress: Address;
    customerInfo: CustomerInfo;
    createdAt?: Date;
    updatedAt?: Date;
}

export enum DeliveryStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    IN_TRANSIT = 'IN_TRANSIT',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED'
}

export interface Address {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

export interface CustomerInfo {
    name: string;
    email: string;
    phone: string;
}

export class Delivery {
    private constructor(private props: DeliveryProps) {
        if (!props.id) throw new Error('Delivery must have an id');

        if (!props.createdAt) {
            this.props.createdAt = new Date();
        }
        this.props.updatedAt = new Date();
    }

    static create(props: Omit<DeliveryProps, 'createdAt' | 'updatedAt'>): Delivery {
        return new Delivery(props);
    }

    static fromPrimitives(props: {
        id: string;
        orderId: string;
        provider: string;
        trackingNumber: string;
        status: DeliveryStatus;
        labelUrl: string;
        shippingAddress: Address;
        customerInfo: CustomerInfo;
        createdAt?: Date;
        updatedAt?: Date;
    }): Delivery {
        return new Delivery({
            id: DeliveryId.fromString(props.id),
            orderId: new OrderId(props.orderId),
            provider: props.provider,
            trackingNumber: props.trackingNumber,
            status: props.status,
            labelUrl: props.labelUrl,
            shippingAddress: props.shippingAddress,
            customerInfo: props.customerInfo,
            createdAt: props.createdAt,
            updatedAt: props.updatedAt
        });
    }

    get id(): DeliveryId {
        return this.props.id!;
    }

    get orderId(): OrderId {
        return this.props.orderId;
    }

    get provider(): string {
        return this.props.provider;
    }

    get trackingNumber(): string {
        return this.props.trackingNumber;
    }

    get status(): DeliveryStatus {
        return this.props.status;
    }

    get labelUrl(): string {
        return this.props.labelUrl;
    }

    get shippingAddress(): Address {
        return this.props.shippingAddress;
    }

    get customerInfo(): CustomerInfo {
        return this.props.customerInfo;
    }

    get createdAt(): Date {
        return this.props.createdAt!;
    }

    get updatedAt(): Date {
        return this.props.updatedAt!;
    }

    updateStatus(status: DeliveryStatus): void {
        this.props.status = status;
        this.props.updatedAt = new Date();
    }

    toPrimitives(): {
        id: string;
        orderId: string;
        provider: string;
        trackingNumber: string;
        status: DeliveryStatus;
        labelUrl: string;
        shippingAddress: Address;
        customerInfo: CustomerInfo;
        createdAt: Date;
        updatedAt: Date;
    } {
        return {
            id: this.id.toString(),
            orderId: this.orderId.toString(),
            provider: this.provider,
            trackingNumber: this.trackingNumber,
            status: this.status,
            labelUrl: this.labelUrl,
            shippingAddress: this.shippingAddress,
            customerInfo: this.customerInfo,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}