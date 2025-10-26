import { MongoDeliveryRepository } from '../../../../src/infrastructure/repositories/MongoDeliveryRepository';
import { Delivery, DeliveryStatus, Address, CustomerInfo } from '../../../../src/domain/entities/Delivery';
import { DeliveryId } from '../../../../src/domain/value-objects/DeliveryId';
import { OrderId } from '../../../../src/domain/value-objects/OrderId';
import { DeliveryModel, DeliveryDocument } from '../../../../src/infrastructure/db/mongo/schemas/DeliverySchema';

// Mock Mongoose model
jest.mock('../../../../src/infrastructure/db/mongo/schemas/DeliverySchema');

describe('MongoDeliveryRepository', () => {
    let repository: MongoDeliveryRepository;
    let mockDeliveryModel: jest.Mocked<typeof DeliveryModel>;

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

    const mockDelivery = Delivery.create({
        id: DeliveryId.fromString('507f1f77bcf86cd799439011'),
        orderId: new OrderId('ORDER-123'),
        provider: 'NRW',
        trackingNumber: 'NRW-123456',
        status: DeliveryStatus.CONFIRMED,
        labelUrl: 'https://example.com/label.pdf',
        shippingAddress: mockAddress,
        customerInfo: mockCustomerInfo
    });

    const mockDeliveryDoc = {
        id: '507f1f77bcf86cd799439011',
        orderId: 'ORDER-123',
        provider: 'NRW',
        trackingNumber: 'NRW-123456',
        status: DeliveryStatus.CONFIRMED,
        labelUrl: 'https://example.com/label.pdf',
        shippingAddress: mockAddress,
        customerInfo: mockCustomerInfo,
        createdAt: new Date('2025-10-25T10:00:00.000Z'),
        updatedAt: new Date('2025-10-25T10:00:00.000Z')
    } as DeliveryDocument;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock for DeliveryModel
        mockDeliveryModel = DeliveryModel as jest.Mocked<typeof DeliveryModel>;

        repository = new MongoDeliveryRepository();
    });

    describe('save', () => {
        it('should create a new delivery document when save is successful', async () => {
            // Arrange
            mockDeliveryModel.create = jest.fn().mockResolvedValue(mockDeliveryDoc);

            // Act
            await repository.save(mockDelivery);

            // Assert
            expect(mockDeliveryModel.create).toHaveBeenCalledWith({
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

        it('should update existing delivery when duplicate key error occurs', async () => {
            // Arrange
            const duplicateKeyError = { code: 11000, name: 'MongoError' };
            mockDeliveryModel.create = jest.fn().mockRejectedValue(duplicateKeyError);
            mockDeliveryModel.updateOne = jest.fn().mockResolvedValue({ acknowledged: true });

            // Act
            await repository.save(mockDelivery);

            // Assert
            expect(mockDeliveryModel.create).toHaveBeenCalledTimes(1);
            expect(mockDeliveryModel.updateOne).toHaveBeenCalledWith(
                { orderId: 'ORDER-123' },
                {
                    $set: {
                        provider: 'NRW',
                        trackingNumber: 'NRW-123456',
                        status: DeliveryStatus.CONFIRMED,
                        labelUrl: 'https://example.com/label.pdf',
                        shippingAddress: mockAddress,
                        customerInfo: mockCustomerInfo,
                        updatedAt: expect.any(Date)
                    }
                }
            );
        });

        it('should throw error when non-duplicate error occurs', async () => {
            // Arrange
            const otherError = new Error('Database connection failed');
            mockDeliveryModel.create = jest.fn().mockRejectedValue(otherError);

            // Act & Assert
            await expect(repository.save(mockDelivery)).rejects.toThrow('Database connection failed');
            expect(mockDeliveryModel.create).toHaveBeenCalledTimes(1);
            expect(mockDeliveryModel.updateOne).not.toHaveBeenCalled();
        });
    });
});