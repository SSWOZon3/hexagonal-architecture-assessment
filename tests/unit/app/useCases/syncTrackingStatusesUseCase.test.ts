import { SyncTrackingStatusesUseCase } from '../../../../src/application/useCases/syncTrackingStatusesUseCase';
import { DeliveryRepository } from '../../../../src/domain/repositories/DeliveryRepository';
import { UpdateDeliveryStatusUseCase } from '../../../../src/application/useCases/updateDeliveryStatus.useCase';
import { ShippingProviderSelector } from '../../../../src/application/ports/ShippingProviderSelector';
import { ShippingProvider, ProviderType, TrackingStatus } from '../../../../src/application/ports/ShippingProvider';
import { Delivery, DeliveryStatus, Address, CustomerInfo } from '../../../../src/domain/entities/Delivery';
import { DeliveryId } from '../../../../src/domain/value-objects/DeliveryId';
import { OrderId } from '../../../../src/domain/value-objects/OrderId';

type MockedShippingProvider = jest.Mocked<ShippingProvider> & {
    getTrackingStatus: jest.MockedFunction<(trackingNumber: string) => Promise<TrackingStatus>>;
};

describe('SyncTrackingStatusesUseCase', () => {
    let syncTrackingStatusesUseCase: SyncTrackingStatusesUseCase;
    let mockDeliveryRepository: jest.Mocked<DeliveryRepository>;
    let mockUpdateDeliveryStatusUseCase: jest.Mocked<UpdateDeliveryStatusUseCase>;
    let mockProviderSelector: jest.Mocked<ShippingProviderSelector>;
    let mockPollingProvider: MockedShippingProvider;
    let mockWebhookProvider: jest.Mocked<ShippingProvider>;

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

    const mockDelivery1 = Delivery.create({
        id: DeliveryId.fromString('507f1f77bcf86cd799439011'),
        orderId: new OrderId('ORDER-123'),
        provider: 'NRW',
        trackingNumber: 'NRW-123456',
        status: DeliveryStatus.CONFIRMED,
        labelUrl: 'https://example.com/label1.pdf',
        shippingAddress: mockAddress,
        customerInfo: mockCustomerInfo
    });

    const mockDelivery2 = Delivery.create({
        id: DeliveryId.fromString('507f1f77bcf86cd799439012'),
        orderId: new OrderId('ORDER-124'),
        provider: 'TLS',
        trackingNumber: 'TLS-789012',
        status: DeliveryStatus.IN_TRANSIT,
        labelUrl: 'https://example.com/label2.pdf',
        shippingAddress: mockAddress,
        customerInfo: mockCustomerInfo
    });

    const mockDelivery3 = Delivery.create({
        id: DeliveryId.fromString('507f1f77bcf86cd799439013'),
        orderId: new OrderId('ORDER-125'),
        provider: 'WebhookProvider',
        trackingNumber: 'WP-345678',
        status: DeliveryStatus.PENDING,
        labelUrl: 'https://example.com/label3.pdf',
        shippingAddress: mockAddress,
        customerInfo: mockCustomerInfo
    });

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

        mockUpdateDeliveryStatusUseCase = {
            execute: jest.fn()
        } as any;

        mockPollingProvider = {
            getName: jest.fn().mockReturnValue('NRW'),
            generateLabel: jest.fn(),
            isAvailable: jest.fn().mockResolvedValue(true),
            getProviderType: jest.fn().mockReturnValue(ProviderType.POLLING),
            getTrackingStatus: jest.fn()
        } as MockedShippingProvider;

        mockWebhookProvider = {
            getName: jest.fn().mockReturnValue('WebhookProvider'),
            generateLabel: jest.fn(),
            isAvailable: jest.fn().mockResolvedValue(true),
            getProviderType: jest.fn().mockReturnValue(ProviderType.WEBHOOK),
            getTrackingStatus: undefined
        } as jest.Mocked<ShippingProvider>;

        mockProviderSelector = {
            selectProvider: jest.fn(),
            getAllProviders: jest.fn().mockReturnValue([mockPollingProvider, mockWebhookProvider])
        };

        syncTrackingStatusesUseCase = new SyncTrackingStatusesUseCase(
            mockDeliveryRepository,
            mockUpdateDeliveryStatusUseCase,
            mockProviderSelector
        );
    });

    describe('execute', () => {
        it('should sync tracking statuses for deliveries with polling providers successfully', async () => {
            // Arrange
            const pollableStatuses = [DeliveryStatus.PENDING, DeliveryStatus.CONFIRMED, DeliveryStatus.IN_TRANSIT];
            mockDeliveryRepository.findByStatus.mockResolvedValue([mockDelivery1, mockDelivery2]);

            const updatedTrackingStatus: TrackingStatus = {
                deliveryId: mockDelivery1.id.toString(),
                status: DeliveryStatus.IN_TRANSIT,
                lastUpdated: new Date(),
                provider: 'NRW'
            };

            mockPollingProvider.getTrackingStatus.mockResolvedValue(updatedTrackingStatus);

            // Act
            await syncTrackingStatusesUseCase.execute();

            // Assert
            expect(mockDeliveryRepository.findByStatus).toHaveBeenCalledWith(pollableStatuses);
            expect(mockProviderSelector.getAllProviders).toHaveBeenCalled();
            expect(mockPollingProvider.getTrackingStatus!).toHaveBeenCalledWith(mockDelivery1.trackingNumber);
            expect(mockUpdateDeliveryStatusUseCase.execute).toHaveBeenCalledWith({
                deliveryId: mockDelivery1.id,
                status: DeliveryStatus.IN_TRANSIT
            });
        });

        it('should not update status when tracking status has not changed', async () => {
            // Arrange
            const pollableStatuses = [DeliveryStatus.PENDING, DeliveryStatus.CONFIRMED, DeliveryStatus.IN_TRANSIT];
            mockDeliveryRepository.findByStatus.mockResolvedValue([mockDelivery1]);

            const sameTrackingStatus: TrackingStatus = {
                deliveryId: mockDelivery1.id.toString(),
                status: DeliveryStatus.CONFIRMED, // Same as current status
                lastUpdated: new Date(),
                provider: 'NRW'
            };

            mockPollingProvider.getTrackingStatus.mockResolvedValue(sameTrackingStatus);
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            // Act
            await syncTrackingStatusesUseCase.execute();

            // Assert
            expect(mockPollingProvider.getTrackingStatus!).toHaveBeenCalledWith(mockDelivery1.trackingNumber);
            expect(mockUpdateDeliveryStatusUseCase.execute).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(`No status change for delivery ${mockDelivery1.trackingNumber}`);

            consoleSpy.mockRestore();
        });

        it('should skip deliveries with webhook providers', async () => {
            // Arrange
            mockDeliveryRepository.findByStatus.mockResolvedValue([mockDelivery3]);

            // Act
            await syncTrackingStatusesUseCase.execute();

            // Assert
            expect(mockUpdateDeliveryStatusUseCase.execute).not.toHaveBeenCalled();
            expect(mockWebhookProvider.getTrackingStatus).toBeUndefined();
        });

        it('should skip deliveries with providers that do not have getTrackingStatus method', async () => {
            // Arrange
            const providerWithoutTracking = {
                ...mockPollingProvider,
                getTrackingStatus: undefined
            };
            mockProviderSelector.getAllProviders.mockReturnValue([providerWithoutTracking]);
            mockDeliveryRepository.findByStatus.mockResolvedValue([mockDelivery1]);

            // Act
            await syncTrackingStatusesUseCase.execute();

            // Assert
            expect(mockUpdateDeliveryStatusUseCase.execute).not.toHaveBeenCalled();
        });

        it('should handle provider getTrackingStatus errors gracefully', async () => {
            // Arrange
            mockDeliveryRepository.findByStatus.mockResolvedValue([mockDelivery1]);
            const trackingError = new Error('Tracking service unavailable');
            mockPollingProvider.getTrackingStatus.mockRejectedValue(trackingError);

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            // Act
            await syncTrackingStatusesUseCase.execute();

            // Assert
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                `Error polling delivery ${mockDelivery1.trackingNumber}:`,
                trackingError
            );
            expect(mockUpdateDeliveryStatusUseCase.execute).not.toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it('should process multiple deliveries with different providers', async () => {
            // Arrange
            const pollingProvider2: MockedShippingProvider = {
                getName: jest.fn().mockReturnValue('TLS'),
                generateLabel: jest.fn(),
                isAvailable: jest.fn().mockResolvedValue(true),
                getProviderType: jest.fn().mockReturnValue(ProviderType.POLLING),
                getTrackingStatus: jest.fn()
            };
            mockProviderSelector.getAllProviders.mockReturnValue([mockPollingProvider, pollingProvider2]);
            mockDeliveryRepository.findByStatus.mockResolvedValue([mockDelivery1, mockDelivery2]);

            const trackingStatus1: TrackingStatus = {
                deliveryId: mockDelivery1.id.toString(),
                status: DeliveryStatus.IN_TRANSIT,
                lastUpdated: new Date(),
                provider: 'NRW'
            };

            const trackingStatus2: TrackingStatus = {
                deliveryId: mockDelivery2.id.toString(),
                status: DeliveryStatus.DELIVERED,
                lastUpdated: new Date(),
                provider: 'TLS'
            };

            mockPollingProvider.getTrackingStatus.mockResolvedValue(trackingStatus1);
            pollingProvider2.getTrackingStatus.mockResolvedValue(trackingStatus2);

            // Act
            await syncTrackingStatusesUseCase.execute();

            // Assert
            expect(mockUpdateDeliveryStatusUseCase.execute).toHaveBeenCalledTimes(2);
            expect(mockUpdateDeliveryStatusUseCase.execute).toHaveBeenCalledWith({
                deliveryId: mockDelivery1.id,
                status: DeliveryStatus.IN_TRANSIT
            });
            expect(mockUpdateDeliveryStatusUseCase.execute).toHaveBeenCalledWith({
                deliveryId: mockDelivery2.id,
                status: DeliveryStatus.DELIVERED
            });
        });

        it('should handle empty deliveries list', async () => {
            // Arrange
            mockDeliveryRepository.findByStatus.mockResolvedValue([]);

            // Act
            await syncTrackingStatusesUseCase.execute();

            // Assert
            expect(mockProviderSelector.getAllProviders).toHaveBeenCalled();
            expect(mockUpdateDeliveryStatusUseCase.execute).not.toHaveBeenCalled();
        });

        it('should handle provider not found for delivery', async () => {
            // Arrange
            const deliveryWithUnknownProvider = Delivery.create({
                id: DeliveryId.fromString('507f1f77bcf86cd799439014'),
                orderId: new OrderId('ORDER-126'),
                provider: 'UnknownProvider',
                trackingNumber: 'UP-111111',
                status: DeliveryStatus.PENDING,
                labelUrl: 'https://example.com/label4.pdf',
                shippingAddress: mockAddress,
                customerInfo: mockCustomerInfo
            });

            mockDeliveryRepository.findByStatus.mockResolvedValue([deliveryWithUnknownProvider]);

            // Act
            await syncTrackingStatusesUseCase.execute();

            // Assert
            expect(mockUpdateDeliveryStatusUseCase.execute).not.toHaveBeenCalled();
        });

        it('should continue processing other deliveries when one fails', async () => {
            // Arrange
            mockDeliveryRepository.findByStatus.mockResolvedValue([mockDelivery1, mockDelivery2]);

            const pollingProvider2: MockedShippingProvider = {
                getName: jest.fn().mockReturnValue('TLS'),
                generateLabel: jest.fn(),
                isAvailable: jest.fn().mockResolvedValue(true),
                getProviderType: jest.fn().mockReturnValue(ProviderType.POLLING),
                getTrackingStatus: jest.fn()
            };
            mockProviderSelector.getAllProviders.mockReturnValue([mockPollingProvider, pollingProvider2]);

            // First delivery fails
            mockPollingProvider.getTrackingStatus.mockRejectedValue(new Error('First delivery error'));

            // Second delivery succeeds
            const trackingStatus2: TrackingStatus = {
                deliveryId: mockDelivery2.id.toString(),
                status: DeliveryStatus.DELIVERED,
                lastUpdated: new Date(),
                provider: 'TLS'
            };
            pollingProvider2.getTrackingStatus.mockResolvedValue(trackingStatus2);

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            // Act
            await syncTrackingStatusesUseCase.execute();

            // Assert
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                `Error polling delivery ${mockDelivery1.trackingNumber}:`,
                expect.any(Error)
            );
            expect(mockUpdateDeliveryStatusUseCase.execute).toHaveBeenCalledWith({
                deliveryId: mockDelivery2.id,
                status: DeliveryStatus.DELIVERED
            });

            consoleErrorSpy.mockRestore();
        });

        it('should handle updateDeliveryStatus errors gracefully', async () => {
            // Arrange
            mockDeliveryRepository.findByStatus.mockResolvedValue([mockDelivery1]);
            const trackingStatus: TrackingStatus = {
                deliveryId: mockDelivery1.id.toString(),
                status: DeliveryStatus.IN_TRANSIT,
                lastUpdated: new Date(),
                provider: 'NRW'
            };
            mockPollingProvider.getTrackingStatus.mockResolvedValue(trackingStatus);

            const updateError = new Error('Update delivery status failed');
            mockUpdateDeliveryStatusUseCase.execute.mockRejectedValue(updateError);

            // Act & Assert
            // Based on the implementation, the use case should complete even if update fails
            // as it processes each delivery independently in a try-catch
            await expect(syncTrackingStatusesUseCase.execute()).resolves.not.toThrow();
        });
    });
});