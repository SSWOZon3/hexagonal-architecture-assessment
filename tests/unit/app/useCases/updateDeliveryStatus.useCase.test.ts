import { UpdateDeliveryStatusUseCase, UpdateDeliveryStatusInput } from '../../../../src/application/useCases/updateDeliveryStatus.useCase';
import { DeliveryRepository } from '../../../../src/domain/repositories/DeliveryRepository';
import { Delivery, DeliveryStatus, Address, CustomerInfo } from '../../../../src/domain/entities/Delivery';
import { DeliveryId } from '../../../../src/domain/value-objects/DeliveryId';
import { OrderId } from '../../../../src/domain/value-objects/OrderId';

describe('UpdateDeliveryStatusUseCase', () => {
    let updateDeliveryStatusUseCase: UpdateDeliveryStatusUseCase;
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

    let mockDelivery: Delivery;

    beforeEach(() => {
        jest.clearAllMocks();

        mockDelivery = Delivery.create({
            id: mockDeliveryId,
            orderId: mockOrderId,
            provider: 'NRW',
            trackingNumber: 'NRW-123456',
            status: DeliveryStatus.CONFIRMED,
            labelUrl: 'https://example.com/label.pdf',
            shippingAddress: mockAddress,
            customerInfo: mockCustomerInfo
        });

        mockDeliveryRepository = {
            save: jest.fn(),
            findById: jest.fn(),
            findByOrderId: jest.fn(),
            findAll: jest.fn(),
            findByTrackingNumber: jest.fn(),
            findByStatus: jest.fn()
        };

        updateDeliveryStatusUseCase = new UpdateDeliveryStatusUseCase(mockDeliveryRepository);
    });

    describe('execute', () => {
        it('should update delivery status successfully when delivery exists', async () => {
            // Arrange
            const input: UpdateDeliveryStatusInput = {
                deliveryId: mockDeliveryId,
                status: DeliveryStatus.IN_TRANSIT
            };

            mockDeliveryRepository.findById.mockResolvedValue(mockDelivery);
            mockDeliveryRepository.save.mockResolvedValue();

            const originalUpdatedAt = mockDelivery.updatedAt;

            // Small delay to ensure time difference
            await new Promise(resolve => setTimeout(resolve, 1));

            // Act
            const result = await updateDeliveryStatusUseCase.execute(input);

            // Assert
            expect(mockDeliveryRepository.findById).toHaveBeenCalledWith(mockDeliveryId);
            expect(mockDeliveryRepository.save).toHaveBeenCalledWith(mockDelivery);
            expect(result).toEqual({
                deliveryId: mockDeliveryId.toString(),
                previousStatus: DeliveryStatus.CONFIRMED,
                newStatus: DeliveryStatus.IN_TRANSIT,
                updatedAt: mockDelivery.updatedAt
            });
            expect(mockDelivery.status).toBe(DeliveryStatus.IN_TRANSIT);
            expect(mockDelivery.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
        });

        it('should throw error when delivery does not exist', async () => {
            // Arrange
            const input: UpdateDeliveryStatusInput = {
                deliveryId: mockDeliveryId,
                status: DeliveryStatus.DELIVERED
            };

            mockDeliveryRepository.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(updateDeliveryStatusUseCase.execute(input)).rejects.toThrow(
                `Delivery with id ${mockDeliveryId} not found`
            );

            expect(mockDeliveryRepository.findById).toHaveBeenCalledWith(mockDeliveryId);
            expect(mockDeliveryRepository.save).not.toHaveBeenCalled();
        });

        it('should handle all delivery status transitions correctly', async () => {
            const statusTransitions = [
                { from: DeliveryStatus.PENDING, to: DeliveryStatus.CONFIRMED },
                { from: DeliveryStatus.CONFIRMED, to: DeliveryStatus.IN_TRANSIT },
                { from: DeliveryStatus.IN_TRANSIT, to: DeliveryStatus.DELIVERED },
                { from: DeliveryStatus.CONFIRMED, to: DeliveryStatus.CANCELLED },
                { from: DeliveryStatus.PENDING, to: DeliveryStatus.CANCELLED }
            ];

            for (const transition of statusTransitions) {
                // Arrange
                const delivery = Delivery.create({
                    id: mockDeliveryId,
                    orderId: mockOrderId,
                    provider: 'NRW',
                    trackingNumber: 'NRW-123456',
                    status: transition.from,
                    labelUrl: 'https://example.com/label.pdf',
                    shippingAddress: mockAddress,
                    customerInfo: mockCustomerInfo
                });

                const input: UpdateDeliveryStatusInput = {
                    deliveryId: mockDeliveryId,
                    status: transition.to
                };

                mockDeliveryRepository.findById.mockResolvedValue(delivery);
                mockDeliveryRepository.save.mockResolvedValue();

                // Act
                const result = await updateDeliveryStatusUseCase.execute(input);

                // Assert
                expect(result.previousStatus).toBe(transition.from);
                expect(result.newStatus).toBe(transition.to);
                expect(delivery.status).toBe(transition.to);
            }
        });

        it('should update the same status correctly', async () => {
            // Arrange
            const input: UpdateDeliveryStatusInput = {
                deliveryId: mockDeliveryId,
                status: DeliveryStatus.CONFIRMED // Same as current status
            };

            mockDeliveryRepository.findById.mockResolvedValue(mockDelivery);
            mockDeliveryRepository.save.mockResolvedValue();

            // Act
            const result = await updateDeliveryStatusUseCase.execute(input);

            // Assert
            expect(result.previousStatus).toBe(DeliveryStatus.CONFIRMED);
            expect(result.newStatus).toBe(DeliveryStatus.CONFIRMED);
            expect(mockDelivery.status).toBe(DeliveryStatus.CONFIRMED);
            expect(mockDeliveryRepository.save).toHaveBeenCalled();
        });

        it('should propagate repository findById errors', async () => {
            // Arrange
            const input: UpdateDeliveryStatusInput = {
                deliveryId: mockDeliveryId,
                status: DeliveryStatus.DELIVERED
            };

            const repositoryError = new Error('Database connection failed');
            mockDeliveryRepository.findById.mockRejectedValue(repositoryError);

            // Act & Assert
            await expect(updateDeliveryStatusUseCase.execute(input)).rejects.toThrow('Database connection failed');

            expect(mockDeliveryRepository.findById).toHaveBeenCalledWith(mockDeliveryId);
            expect(mockDeliveryRepository.save).not.toHaveBeenCalled();
        });

        it('should propagate repository save errors', async () => {
            // Arrange
            const input: UpdateDeliveryStatusInput = {
                deliveryId: mockDeliveryId,
                status: DeliveryStatus.DELIVERED
            };

            mockDeliveryRepository.findById.mockResolvedValue(mockDelivery);
            const saveError = new Error('Save operation failed');
            mockDeliveryRepository.save.mockRejectedValue(saveError);

            // Act & Assert
            await expect(updateDeliveryStatusUseCase.execute(input)).rejects.toThrow('Save operation failed');

            expect(mockDeliveryRepository.findById).toHaveBeenCalledWith(mockDeliveryId);
            expect(mockDeliveryRepository.save).toHaveBeenCalledWith(mockDelivery);
        });

        it('should return correct timestamps in response', async () => {
            // Arrange
            const input: UpdateDeliveryStatusInput = {
                deliveryId: mockDeliveryId,
                status: DeliveryStatus.IN_TRANSIT
            };

            mockDeliveryRepository.findById.mockResolvedValue(mockDelivery);
            mockDeliveryRepository.save.mockResolvedValue();

            const beforeUpdate = new Date();

            // Act
            const result = await updateDeliveryStatusUseCase.execute(input);

            // Assert
            expect(result.updatedAt).toBeInstanceOf(Date);
            expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
        });

        it('should call updateStatus method on delivery entity', async () => {
            // Arrange
            const input: UpdateDeliveryStatusInput = {
                deliveryId: mockDeliveryId,
                status: DeliveryStatus.DELIVERED
            };

            mockDeliveryRepository.findById.mockResolvedValue(mockDelivery);
            mockDeliveryRepository.save.mockResolvedValue();

            const updateStatusSpy = jest.spyOn(mockDelivery, 'updateStatus');

            // Act
            await updateDeliveryStatusUseCase.execute(input);

            // Assert
            expect(updateStatusSpy).toHaveBeenCalledWith(DeliveryStatus.DELIVERED);
        });

        it('should handle multiple consecutive status updates', async () => {
            // Arrange
            mockDeliveryRepository.findById.mockResolvedValue(mockDelivery);
            mockDeliveryRepository.save.mockResolvedValue();

            const statusSequence = [
                DeliveryStatus.IN_TRANSIT,
                DeliveryStatus.DELIVERED
            ];

            // Act & Assert
            for (let i = 0; i < statusSequence.length; i++) {
                const input: UpdateDeliveryStatusInput = {
                    deliveryId: mockDeliveryId,
                    status: statusSequence[i]
                };

                const result = await updateDeliveryStatusUseCase.execute(input);

                expect(result.newStatus).toBe(statusSequence[i]);
                expect(mockDelivery.status).toBe(statusSequence[i]);

                if (i === 0) {
                    expect(result.previousStatus).toBe(DeliveryStatus.CONFIRMED);
                } else {
                    expect(result.previousStatus).toBe(statusSequence[i - 1]);
                }
            }

            expect(mockDeliveryRepository.save).toHaveBeenCalledTimes(statusSequence.length);
        });

        it('should preserve other delivery properties when updating status', async () => {
            // Arrange
            const input: UpdateDeliveryStatusInput = {
                deliveryId: mockDeliveryId,
                status: DeliveryStatus.DELIVERED
            };

            const originalProvider = mockDelivery.provider;
            const originalTrackingNumber = mockDelivery.trackingNumber;
            const originalLabelUrl = mockDelivery.labelUrl;

            mockDeliveryRepository.findById.mockResolvedValue(mockDelivery);
            mockDeliveryRepository.save.mockResolvedValue();

            // Act
            await updateDeliveryStatusUseCase.execute(input);

            // Assert
            expect(mockDelivery.provider).toBe(originalProvider);
            expect(mockDelivery.trackingNumber).toBe(originalTrackingNumber);
            expect(mockDelivery.labelUrl).toBe(originalLabelUrl);
            expect(mockDelivery.id).toEqual(mockDeliveryId);
            expect(mockDelivery.orderId).toEqual(mockOrderId);
        });
    });
});