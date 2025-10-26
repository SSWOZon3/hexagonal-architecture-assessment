import { Delivery, DeliveryStatus, Address, CustomerInfo, DeliveryProps } from '../../../../src/domain/entities/Delivery';
import { DeliveryId } from '../../../../src/domain/value-objects/DeliveryId';
import { OrderId } from '../../../../src/domain/value-objects/OrderId';

describe('Delivery Entity', () => {
    const mockAddress: Address = {
        street: '123 Main St',
        city: 'Madrid',
        state: 'Madrid',
        zipCode: '28001',
        country: 'Spain'
    };

    const mockCustomerInfo: CustomerInfo = {
        name: 'Juan Pérez',
        email: 'juan@example.com',
        phone: '+34123456789'
    };

    const getValidDeliveryProps = () => ({
        id: DeliveryId.fromString('507f1f77bcf86cd799439011'),
        orderId: new OrderId('ORDER-123'),
        provider: 'NRW',
        trackingNumber: 'NRW-123456',
        status: DeliveryStatus.CONFIRMED,
        labelUrl: 'https://example.com/label.pdf',
        shippingAddress: { ...mockAddress },
        customerInfo: { ...mockCustomerInfo }
    });

    describe('create', () => {
        it('should create a delivery with valid properties', () => {
            // Act
            const delivery = Delivery.create(getValidDeliveryProps());

            // Assert
            expect(delivery).toBeInstanceOf(Delivery);
            expect(delivery.id.toString()).toBe('507f1f77bcf86cd799439011');
            expect(delivery.orderId.toString()).toBe('ORDER-123');
            expect(delivery.provider).toBe('NRW');
            expect(delivery.trackingNumber).toBe('NRW-123456');
            expect(delivery.status).toBe(DeliveryStatus.CONFIRMED);
            expect(delivery.labelUrl).toBe('https://example.com/label.pdf');
            expect(delivery.shippingAddress).toEqual(mockAddress);
            expect(delivery.customerInfo).toEqual(mockCustomerInfo);
            expect(delivery.createdAt).toBeInstanceOf(Date);
            expect(delivery.updatedAt).toBeInstanceOf(Date);
        });

        it('should throw error when id is missing', () => {
            // Arrange
            const propsWithoutId = { ...getValidDeliveryProps(), id: undefined } as any;

            // Act & Assert
            expect(() => Delivery.create(propsWithoutId)).toThrow('Delivery must have an id');
        });

        it('should set createdAt and updatedAt to current date if not provided', () => {
            // Arrange
            const beforeCreate = new Date();

            // Act
            const delivery = Delivery.create(getValidDeliveryProps());

            // Assert
            const afterCreate = new Date();
            expect(delivery.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 10);
            expect(delivery.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
            expect(delivery.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 10);
            expect(delivery.updatedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
        });

        it('should preserve createdAt but always set updatedAt to current time', () => {
            // Arrange
            const fixedCreatedAt = new Date('2025-01-01T10:00:00.000Z');
            const fixedUpdatedAt = new Date('2025-01-01T12:00:00.000Z');
            const propsWithDates = {
                ...getValidDeliveryProps(),
                createdAt: fixedCreatedAt,
                updatedAt: fixedUpdatedAt
            };
            const beforeCreate = new Date();

            // Act
            const delivery = Delivery.create(propsWithDates);

            // Assert
            expect(delivery.createdAt).toEqual(fixedCreatedAt);
            // updatedAt is always set to current time in constructor
            expect(delivery.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime() - 10);
        });
    });

    describe('fromPrimitives', () => {
        const primitiveProps = {
            id: '507f1f77bcf86cd799439011',
            orderId: 'ORDER-123',
            provider: 'NRW',
            trackingNumber: 'NRW-123456',
            status: DeliveryStatus.CONFIRMED,
            labelUrl: 'https://example.com/label.pdf',
            shippingAddress: mockAddress,
            customerInfo: mockCustomerInfo,
            createdAt: new Date('2025-01-01T10:00:00.000Z'),
            updatedAt: new Date('2025-01-01T12:00:00.000Z')
        };

        it('should create delivery from primitive data', () => {
            // Act
            const delivery = Delivery.fromPrimitives(primitiveProps);

            // Assert
            expect(delivery).toBeInstanceOf(Delivery);
            expect(delivery.id.toString()).toBe('507f1f77bcf86cd799439011');
            expect(delivery.orderId.toString()).toBe('ORDER-123');
            expect(delivery.provider).toBe('NRW');
            expect(delivery.trackingNumber).toBe('NRW-123456');
            expect(delivery.status).toBe(DeliveryStatus.CONFIRMED);
            expect(delivery.labelUrl).toBe('https://example.com/label.pdf');
            expect(delivery.shippingAddress).toEqual(mockAddress);
            expect(delivery.customerInfo).toEqual(mockCustomerInfo);
            expect(delivery.createdAt).toEqual(new Date('2025-01-01T10:00:00.000Z'));
            expect(delivery.updatedAt).toBeInstanceOf(Date);
        });

        it('should handle primitives without dates', () => {
            // Arrange
            const propsWithoutDates = {
                id: '507f1f77bcf86cd799439011',
                orderId: 'ORDER-123',
                provider: 'NRW',
                trackingNumber: 'NRW-123456',
                status: DeliveryStatus.CONFIRMED,
                labelUrl: 'https://example.com/label.pdf',
                shippingAddress: mockAddress,
                customerInfo: mockCustomerInfo
            };

            // Act
            const delivery = Delivery.fromPrimitives(propsWithoutDates);

            // Assert
            expect(delivery).toBeInstanceOf(Delivery);
            expect(delivery.createdAt).toBeInstanceOf(Date);
            expect(delivery.updatedAt).toBeInstanceOf(Date);
        });
    });

    describe('updateStatus', () => {
        it('should update delivery status and updatedAt', () => {
            // Arrange
            const delivery = Delivery.create(getValidDeliveryProps());
            const originalUpdatedAt = delivery.updatedAt;

            // Wait a small amount to ensure different timestamp
            setTimeout(() => {
                // Act
                delivery.updateStatus(DeliveryStatus.IN_TRANSIT);

                // Assert
                expect(delivery.status).toBe(DeliveryStatus.IN_TRANSIT);
                expect(delivery.updatedAt).not.toEqual(originalUpdatedAt);
                expect(delivery.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
            }, 1);
        });

        it('should update status multiple times correctly', () => {
            // Arrange
            const delivery = Delivery.create(getValidDeliveryProps());

            // Act & Assert
            delivery.updateStatus(DeliveryStatus.IN_TRANSIT);
            expect(delivery.status).toBe(DeliveryStatus.IN_TRANSIT);

            delivery.updateStatus(DeliveryStatus.DELIVERED);
            expect(delivery.status).toBe(DeliveryStatus.DELIVERED);

            delivery.updateStatus(DeliveryStatus.CANCELLED);
            expect(delivery.status).toBe(DeliveryStatus.CANCELLED);
        });
    });

    describe('toPrimitives', () => {
        it('should return primitive representation of delivery', () => {
            // Arrange
            const delivery = Delivery.create(getValidDeliveryProps());

            // Act
            const primitives = delivery.toPrimitives();

            // Assert
            expect(primitives).toEqual({
                id: '507f1f77bcf86cd799439011',
                orderId: 'ORDER-123',
                provider: 'NRW',
                trackingNumber: 'NRW-123456',
                status: DeliveryStatus.CONFIRMED,
                labelUrl: 'https://example.com/label.pdf',
                shippingAddress: mockAddress,
                customerInfo: mockCustomerInfo,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date)
            });
        });

        it('should return consistent primitives after updates', () => {
            // Arrange
            const delivery = Delivery.create(getValidDeliveryProps());
            delivery.updateStatus(DeliveryStatus.DELIVERED);

            // Act
            const primitives = delivery.toPrimitives();

            // Assert
            expect(primitives.status).toBe(DeliveryStatus.DELIVERED);
            expect(primitives.updatedAt).toEqual(delivery.updatedAt);
        });
    });

    describe('getters', () => {
        it('should provide access to all properties through getters', () => {
            // Arrange
            const delivery = Delivery.create(getValidDeliveryProps());

            // Act & Assert
            expect(delivery.id).toBeInstanceOf(DeliveryId);
            expect(delivery.id.toString()).toBe('507f1f77bcf86cd799439011');
            expect(delivery.orderId).toBeInstanceOf(OrderId);
            expect(delivery.orderId.toString()).toBe('ORDER-123');
            expect(delivery.provider).toBe('NRW');
            expect(delivery.trackingNumber).toBe('NRW-123456');
            expect(delivery.status).toBe(DeliveryStatus.CONFIRMED);
            expect(delivery.labelUrl).toBe('https://example.com/label.pdf');
            expect(delivery.shippingAddress).toEqual(mockAddress);
            expect(delivery.customerInfo).toEqual(mockCustomerInfo);
            expect(delivery.createdAt).toBeInstanceOf(Date);
            expect(delivery.updatedAt).toBeInstanceOf(Date);
        });
    });
});