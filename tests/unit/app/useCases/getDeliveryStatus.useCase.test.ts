import { GetDeliveryStatusUseCase, GetDeliveryStatusInput } from '../../../../src/application/useCases/getDeliveryStatus.useCase';
import { DeliveryRepository } from '../../../../src/domain/repositories/DeliveryRepository';
import { Delivery, DeliveryStatus, Address, CustomerInfo } from '../../../../src/domain/entities/Delivery';
import { DeliveryId } from '../../../../src/domain/value-objects/DeliveryId';
import { OrderId } from '../../../../src/domain/value-objects/OrderId';

describe('GetDeliveryStatusUseCase', () => {
    let getDeliveryStatusUseCase: GetDeliveryStatusUseCase;
    let mockDeliveryRepository: jest.Mocked<DeliveryRepository>;

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

    const mockDeliveryId = DeliveryId.fromString('507f1f77bcf86cd799439011');
    const mockOrderId = new OrderId('ORDER-123');

    const mockDelivery = Delivery.create({
        id: mockDeliveryId,
        orderId: mockOrderId,
        provider: 'NRW',
        trackingNumber: 'NRW-123456',
        status: DeliveryStatus.CONFIRMED,
        labelUrl: 'https://example.com/label.pdf',
        shippingAddress: mockAddress,
        customerInfo: mockCustomerInfo
    });

    const validInput: GetDeliveryStatusInput = {
        deliveryId: mockDeliveryId.toString()
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockDeliveryRepository = {
            save: jest.fn(),
            findById: jest.fn(),
            findByOrderId: jest.fn(),
            findAll: jest.fn(),
            findByTrackingNumber: jest.fn(),
            findByStatus: jest.fn()
        };

        getDeliveryStatusUseCase = new GetDeliveryStatusUseCase(mockDeliveryRepository);
    });

    describe('execute', () => {
        it('should return delivery status successfully when delivery exists', async () => {
            // Arrange
            mockDeliveryRepository.findById.mockResolvedValue(mockDelivery);

            // Act
            const result = await getDeliveryStatusUseCase.execute(validInput);

            // Assert
            expect(mockDeliveryRepository.findById).toHaveBeenCalledWith(mockDeliveryId);
            expect(result).toEqual({
                deliveryId: mockDeliveryId.toString(),
                orderId: mockOrderId.toString(),
                provider: 'NRW',
                status: DeliveryStatus.CONFIRMED,
                labelUrl: 'https://example.com/label.pdf',
                createdAt: mockDelivery.createdAt,
                updatedAt: mockDelivery.updatedAt
            });
        });

        it('should throw error when delivery does not exist', async () => {
            // Arrange
            mockDeliveryRepository.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(getDeliveryStatusUseCase.execute(validInput)).rejects.toThrow(
                `Delivery with id ${validInput.deliveryId} not found`
            );

            expect(mockDeliveryRepository.findById).toHaveBeenCalledWith(mockDeliveryId);
        });

        it('should handle invalid delivery id format', async () => {
            // Arrange
            const invalidInput: GetDeliveryStatusInput = {
                deliveryId: 'invalid-id'
            };

            // Act & Assert
            await expect(getDeliveryStatusUseCase.execute(invalidInput)).rejects.toThrow();
        });

        it('should handle empty delivery id', async () => {
            // Arrange
            const invalidInput: GetDeliveryStatusInput = {
                deliveryId: ''
            };

            // Act & Assert
            await expect(getDeliveryStatusUseCase.execute(invalidInput)).rejects.toThrow();
        });

        it('should return correct status for delivered delivery', async () => {
            // Arrange
            const deliveredDelivery = Delivery.create({
                id: mockDeliveryId,
                orderId: mockOrderId,
                provider: 'TLS',
                trackingNumber: 'TLS-789',
                status: DeliveryStatus.DELIVERED,
                labelUrl: 'https://example.com/delivered-label.pdf',
                shippingAddress: mockAddress,
                customerInfo: mockCustomerInfo
            });
            mockDeliveryRepository.findById.mockResolvedValue(deliveredDelivery);

            // Act
            const result = await getDeliveryStatusUseCase.execute(validInput);

            // Assert
            expect(result.status).toBe(DeliveryStatus.DELIVERED);
            expect(result.provider).toBe('TLS');
        });

        it('should propagate repository errors', async () => {
            // Arrange
            const repositoryError = new Error('Database connection failed');
            mockDeliveryRepository.findById.mockRejectedValue(repositoryError);

            // Act & Assert
            await expect(getDeliveryStatusUseCase.execute(validInput)).rejects.toThrow('Database connection failed');

            expect(mockDeliveryRepository.findById).toHaveBeenCalledWith(mockDeliveryId);
        });

        it('should return delivery with different statuses correctly', async () => {
            // Test all possible delivery statuses
            const statusTests = [
                DeliveryStatus.PENDING,
                DeliveryStatus.CONFIRMED,
                DeliveryStatus.IN_TRANSIT,
                DeliveryStatus.DELIVERED,
                DeliveryStatus.CANCELLED
            ];

            for (const status of statusTests) {
                // Arrange
                const deliveryWithStatus = Delivery.create({
                    id: mockDeliveryId,
                    orderId: mockOrderId,
                    provider: 'NRW',
                    trackingNumber: `NRW-${status}`,
                    status: status,
                    labelUrl: 'https://example.com/label.pdf',
                    shippingAddress: mockAddress,
                    customerInfo: mockCustomerInfo
                });
                mockDeliveryRepository.findById.mockResolvedValue(deliveryWithStatus);

                // Act
                const result = await getDeliveryStatusUseCase.execute(validInput);

                // Assert
                expect(result.status).toBe(status);
                expect(result.deliveryId).toBe(mockDeliveryId.toString());
            }
        });

        it('should handle null delivery id parameter', async () => {
            // Arrange
            const nullInput = { deliveryId: null as any };

            // Act & Assert
            await expect(getDeliveryStatusUseCase.execute(nullInput)).rejects.toThrow();
        });

        it('should preserve timestamps in the response', async () => {
            // Arrange
            mockDeliveryRepository.findById.mockResolvedValue(mockDelivery);

            // Act
            const result = await getDeliveryStatusUseCase.execute(validInput);

            // Assert
            expect(result.createdAt).toBeInstanceOf(Date);
            expect(result.updatedAt).toBeInstanceOf(Date);
            expect(result.createdAt).toBe(mockDelivery.createdAt);
            expect(result.updatedAt).toBe(mockDelivery.updatedAt);
        });
    });
});