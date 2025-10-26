import {
    ProcessWebhookDeliveryStatusUseCase,
    ProcessWebhookDeliveryStatusInput,
    DeliveryNotFoundError,
    InvalidDeliveryStatusError,
    NoStatusChangeError
} from '../../../../src/application/useCases/processWebhookDeliveryStatus.useCase';
import { UpdateDeliveryStatusUseCase } from '../../../../src/application/useCases/updateDeliveryStatus.useCase';
import { DeliveryRepository } from '../../../../src/domain/repositories/DeliveryRepository';
import { Delivery, DeliveryStatus, Address, CustomerInfo } from '../../../../src/domain/entities/Delivery';
import { DeliveryId } from '../../../../src/domain/value-objects/DeliveryId';
import { OrderId } from '../../../../src/domain/value-objects/OrderId';

describe('ProcessWebhookDeliveryStatusUseCase', () => {
    let processWebhookDeliveryStatusUseCase: ProcessWebhookDeliveryStatusUseCase;
    let mockDeliveryRepository: jest.Mocked<DeliveryRepository>;
    let mockUpdateDeliveryStatusUseCase: jest.Mocked<UpdateDeliveryStatusUseCase>;

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
    const mockTrackingNumber = 'NRW-123456';

    let mockDelivery: Delivery;

    const validInput: ProcessWebhookDeliveryStatusInput = {
        trackingNumber: mockTrackingNumber,
        status: DeliveryStatus.IN_TRANSIT,
        timestamp: '2025-10-25T10:00:00Z',
        signature: 'valid-signature'
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockDelivery = Delivery.create({
            id: mockDeliveryId,
            orderId: mockOrderId,
            provider: 'NRW',
            trackingNumber: mockTrackingNumber,
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

        mockUpdateDeliveryStatusUseCase = {
            execute: jest.fn()
        } as any;

        processWebhookDeliveryStatusUseCase = new ProcessWebhookDeliveryStatusUseCase(
            mockDeliveryRepository,
            mockUpdateDeliveryStatusUseCase
        );
    });

    describe('execute', () => {
        it('should process webhook and update delivery status successfully', async () => {
            // Arrange
            mockDeliveryRepository.findByTrackingNumber.mockResolvedValue(mockDelivery);
            mockUpdateDeliveryStatusUseCase.execute.mockResolvedValue({
                deliveryId: mockDeliveryId.toString(),
                previousStatus: DeliveryStatus.CONFIRMED,
                newStatus: DeliveryStatus.IN_TRANSIT,
                updatedAt: new Date()
            });

            // Act
            const result = await processWebhookDeliveryStatusUseCase.execute(validInput);

            // Assert
            expect(mockDeliveryRepository.findByTrackingNumber).toHaveBeenCalledWith(mockTrackingNumber);
            expect(mockUpdateDeliveryStatusUseCase.execute).toHaveBeenCalledWith({
                deliveryId: mockDeliveryId,
                status: DeliveryStatus.IN_TRANSIT
            });
            expect(result).toEqual({
                deliveryId: mockDeliveryId.toString(),
                orderId: mockOrderId.toString(),
                trackingNumber: mockTrackingNumber,
                provider: 'NRW',
                previousStatus: DeliveryStatus.CONFIRMED,
                newStatus: DeliveryStatus.IN_TRANSIT
            });
        });

        it('should throw DeliveryNotFoundError when delivery does not exist', async () => {
            // Arrange
            mockDeliveryRepository.findByTrackingNumber.mockResolvedValue(null);

            // Act & Assert
            await expect(processWebhookDeliveryStatusUseCase.execute(validInput)).rejects.toThrow(DeliveryNotFoundError);
            await expect(processWebhookDeliveryStatusUseCase.execute(validInput)).rejects.toThrow(
                `Delivery with tracking number ${mockTrackingNumber} not found`
            );

            expect(mockDeliveryRepository.findByTrackingNumber).toHaveBeenCalledWith(mockTrackingNumber);
            expect(mockUpdateDeliveryStatusUseCase.execute).not.toHaveBeenCalled();
        });

        it('should throw InvalidDeliveryStatusError for invalid status', async () => {
            // Arrange
            const invalidInput: ProcessWebhookDeliveryStatusInput = {
                ...validInput,
                status: 'INVALID_STATUS' as DeliveryStatus
            };
            mockDeliveryRepository.findByTrackingNumber.mockResolvedValue(mockDelivery);

            // Act & Assert
            await expect(processWebhookDeliveryStatusUseCase.execute(invalidInput)).rejects.toThrow(InvalidDeliveryStatusError);
            await expect(processWebhookDeliveryStatusUseCase.execute(invalidInput)).rejects.toThrow(
                'Invalid delivery status: INVALID_STATUS'
            );

            expect(mockDeliveryRepository.findByTrackingNumber).toHaveBeenCalledWith(mockTrackingNumber);
            expect(mockUpdateDeliveryStatusUseCase.execute).not.toHaveBeenCalled();
        });

        it('should throw NoStatusChangeError when status has not changed', async () => {
            // Arrange
            const sameStatusInput: ProcessWebhookDeliveryStatusInput = {
                ...validInput,
                status: DeliveryStatus.CONFIRMED // Same as current status
            };
            mockDeliveryRepository.findByTrackingNumber.mockResolvedValue(mockDelivery);

            // Act & Assert
            await expect(processWebhookDeliveryStatusUseCase.execute(sameStatusInput)).rejects.toThrow(NoStatusChangeError);
            await expect(processWebhookDeliveryStatusUseCase.execute(sameStatusInput)).rejects.toThrow(
                `Delivery ${mockTrackingNumber} already has status ${DeliveryStatus.CONFIRMED}`
            );

            expect(mockDeliveryRepository.findByTrackingNumber).toHaveBeenCalledWith(mockTrackingNumber);
            expect(mockUpdateDeliveryStatusUseCase.execute).not.toHaveBeenCalled();
        });

        it('should handle all valid delivery status updates', async () => {
            const validStatuses = [
                DeliveryStatus.PENDING,
                DeliveryStatus.CONFIRMED,
                DeliveryStatus.IN_TRANSIT,
                DeliveryStatus.DELIVERED,
                DeliveryStatus.CANCELLED
            ];

            for (const status of validStatuses) {
                if (status === DeliveryStatus.CONFIRMED) continue; // Skip same status

                // Arrange
                const input: ProcessWebhookDeliveryStatusInput = {
                    ...validInput,
                    status
                };
                mockDeliveryRepository.findByTrackingNumber.mockResolvedValue(mockDelivery);
                mockUpdateDeliveryStatusUseCase.execute.mockResolvedValue({
                    deliveryId: mockDeliveryId.toString(),
                    previousStatus: DeliveryStatus.CONFIRMED,
                    newStatus: status,
                    updatedAt: new Date()
                });

                // Act
                const result = await processWebhookDeliveryStatusUseCase.execute(input);

                // Assert
                expect(result.newStatus).toBe(status);
                expect(result.previousStatus).toBe(DeliveryStatus.CONFIRMED);
            }
        });

        it('should propagate repository errors', async () => {
            // Arrange
            const repositoryError = new Error('Database connection failed');
            mockDeliveryRepository.findByTrackingNumber.mockRejectedValue(repositoryError);

            // Act & Assert
            await expect(processWebhookDeliveryStatusUseCase.execute(validInput)).rejects.toThrow('Database connection failed');

            expect(mockDeliveryRepository.findByTrackingNumber).toHaveBeenCalledWith(mockTrackingNumber);
            expect(mockUpdateDeliveryStatusUseCase.execute).not.toHaveBeenCalled();
        });

        it('should propagate updateDeliveryStatus errors', async () => {
            // Arrange
            mockDeliveryRepository.findByTrackingNumber.mockResolvedValue(mockDelivery);
            const updateError = new Error('Update delivery status failed');
            mockUpdateDeliveryStatusUseCase.execute.mockRejectedValue(updateError);

            // Act & Assert
            await expect(processWebhookDeliveryStatusUseCase.execute(validInput)).rejects.toThrow('Update delivery status failed');

            expect(mockDeliveryRepository.findByTrackingNumber).toHaveBeenCalledWith(mockTrackingNumber);
            expect(mockUpdateDeliveryStatusUseCase.execute).toHaveBeenCalledWith({
                deliveryId: mockDeliveryId,
                status: DeliveryStatus.IN_TRANSIT
            });
        });

        it('should handle webhook input without signature', async () => {
            // Arrange
            const inputWithoutSignature: ProcessWebhookDeliveryStatusInput = {
                trackingNumber: mockTrackingNumber,
                status: DeliveryStatus.DELIVERED,
                timestamp: '2025-10-25T10:00:00Z'
                // signature is optional
            };
            mockDeliveryRepository.findByTrackingNumber.mockResolvedValue(mockDelivery);
            mockUpdateDeliveryStatusUseCase.execute.mockResolvedValue({
                deliveryId: mockDeliveryId.toString(),
                previousStatus: DeliveryStatus.CONFIRMED,
                newStatus: DeliveryStatus.DELIVERED,
                updatedAt: new Date()
            });

            // Act
            const result = await processWebhookDeliveryStatusUseCase.execute(inputWithoutSignature);

            // Assert
            expect(result.newStatus).toBe(DeliveryStatus.DELIVERED);
            expect(mockUpdateDeliveryStatusUseCase.execute).toHaveBeenCalled();
        });

        it('should return correct output structure', async () => {
            // Arrange
            mockDeliveryRepository.findByTrackingNumber.mockResolvedValue(mockDelivery);
            mockUpdateDeliveryStatusUseCase.execute.mockResolvedValue({
                deliveryId: mockDeliveryId.toString(),
                previousStatus: DeliveryStatus.CONFIRMED,
                newStatus: DeliveryStatus.DELIVERED,
                updatedAt: new Date()
            });

            const input: ProcessWebhookDeliveryStatusInput = {
                trackingNumber: mockTrackingNumber,
                status: DeliveryStatus.DELIVERED,
                timestamp: '2025-10-25T10:00:00Z'
            };

            // Act
            const result = await processWebhookDeliveryStatusUseCase.execute(input);

            // Assert
            expect(result).toHaveProperty('deliveryId');
            expect(result).toHaveProperty('orderId');
            expect(result).toHaveProperty('trackingNumber');
            expect(result).toHaveProperty('provider');
            expect(result).toHaveProperty('previousStatus');
            expect(result).toHaveProperty('newStatus');

            expect(typeof result.deliveryId).toBe('string');
            expect(typeof result.orderId).toBe('string');
            expect(typeof result.trackingNumber).toBe('string');
            expect(typeof result.provider).toBe('string');
        });

        it('should handle different tracking numbers', async () => {
            // Test with different tracking number formats
            const trackingNumbers = [
                'NRW-123456',
                'TLS-789012',
                'DHL-345678',
                'UPS-901234'
            ];

            for (const trackingNumber of trackingNumbers) {
                // Arrange
                const deliveryWithTrackingNumber = Delivery.create({
                    id: mockDeliveryId,
                    orderId: mockOrderId,
                    provider: 'Test Provider',
                    trackingNumber,
                    status: DeliveryStatus.PENDING,
                    labelUrl: 'https://example.com/label.pdf',
                    shippingAddress: mockAddress,
                    customerInfo: mockCustomerInfo
                });

                const input: ProcessWebhookDeliveryStatusInput = {
                    trackingNumber,
                    status: DeliveryStatus.IN_TRANSIT,
                    timestamp: '2025-10-25T10:00:00Z'
                };

                mockDeliveryRepository.findByTrackingNumber.mockResolvedValue(deliveryWithTrackingNumber);
                mockUpdateDeliveryStatusUseCase.execute.mockResolvedValue({
                    deliveryId: mockDeliveryId.toString(),
                    previousStatus: DeliveryStatus.PENDING,
                    newStatus: DeliveryStatus.IN_TRANSIT,
                    updatedAt: new Date()
                });

                // Act
                const result = await processWebhookDeliveryStatusUseCase.execute(input);

                // Assert
                expect(result.trackingNumber).toBe(trackingNumber);
                expect(mockDeliveryRepository.findByTrackingNumber).toHaveBeenCalledWith(trackingNumber);
            }
        });

        it('should handle empty tracking number', async () => {
            // Arrange
            const invalidInput: ProcessWebhookDeliveryStatusInput = {
                trackingNumber: '',
                status: DeliveryStatus.IN_TRANSIT,
                timestamp: '2025-10-25T10:00:00Z'
            };

            mockDeliveryRepository.findByTrackingNumber.mockResolvedValue(null);

            // Act & Assert
            await expect(processWebhookDeliveryStatusUseCase.execute(invalidInput)).rejects.toThrow(DeliveryNotFoundError);
        });

        it('should handle case sensitive status validation', async () => {
            // Arrange
            const mixedCaseInput: ProcessWebhookDeliveryStatusInput = {
                trackingNumber: mockTrackingNumber,
                status: 'in_transit' as DeliveryStatus, // lowercase
                timestamp: '2025-10-25T10:00:00Z'
            };
            mockDeliveryRepository.findByTrackingNumber.mockResolvedValue(mockDelivery);

            // Act & Assert
            await expect(processWebhookDeliveryStatusUseCase.execute(mixedCaseInput)).rejects.toThrow(InvalidDeliveryStatusError);
        });
    });
});