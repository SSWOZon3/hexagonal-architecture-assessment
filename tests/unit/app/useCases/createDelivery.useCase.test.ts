import { CreateDeliveryUseCase, CreateDeliveryInput } from '../../../../src/application/useCases/createDelivery.useCase';
import { DeliveryRepository } from '../../../../src/domain/repositories/DeliveryRepository';
import { ShippingProviderSelector } from '../../../../src/application/ports/ShippingProviderSelector';
import { IdProvider } from '../../../../src/application/ports/IdProvider';
import { ShippingProvider, ShippingLabel } from '../../../../src/application/ports/ShippingProvider';
import { Delivery, DeliveryStatus, Address, CustomerInfo } from '../../../../src/domain/entities/Delivery';
import { OrderId } from '../../../../src/domain/value-objects/OrderId';
import { DeliveryId } from '../../../../src/domain/value-objects/DeliveryId';

describe('CreateDeliveryUseCase', () => {
    let createDeliveryUseCase: CreateDeliveryUseCase;
    let mockDeliveryRepository: jest.Mocked<DeliveryRepository>;
    let mockProviderSelector: jest.Mocked<ShippingProviderSelector>;
    let mockIdProvider: jest.Mocked<IdProvider>;
    let mockShippingProvider: jest.Mocked<ShippingProvider>;

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

    const mockInput: CreateDeliveryInput = {
        orderId: 'ORDER-123',
        shippingAddress: mockAddress,
        customerInfo: mockCustomerInfo
    };

    const mockShippingLabel: ShippingLabel = {
        provider: 'NRW',
        trackingNumber: 'NRW-123456',
        labelUrl: 'https://example.com/label.pdf',
        estimatedDelivery: new Date('2025-11-01')
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

        mockShippingProvider = {
            getName: jest.fn().mockReturnValue('NRW'),
            generateLabel: jest.fn().mockResolvedValue(mockShippingLabel),
            isAvailable: jest.fn().mockResolvedValue(true),
            getProviderType: jest.fn(),
            getTrackingStatus: jest.fn()
        };

        mockProviderSelector = {
            selectProvider: jest.fn().mockReturnValue(mockShippingProvider),
            getAllProviders: jest.fn()
        };

        mockIdProvider = {
            newDeliveryId: jest.fn().mockReturnValue(DeliveryId.fromString('507f1f77bcf86cd799439011'))
        };

        // Create use case instance
        createDeliveryUseCase = new CreateDeliveryUseCase(
            mockDeliveryRepository,
            mockProviderSelector,
            mockIdProvider
        );
    });

    describe('execute', () => {
        it('should create a delivery successfully when all conditions are met', async () => {
            // Arrange
            mockDeliveryRepository.findByOrderId.mockResolvedValue(null);

            // Act
            const result = await createDeliveryUseCase.execute(mockInput);

            // Assert
            expect(mockDeliveryRepository.findByOrderId).toHaveBeenCalledWith(new OrderId('ORDER-123'));
            expect(mockProviderSelector.selectProvider).toHaveBeenCalled();
            expect(mockShippingProvider.generateLabel).toHaveBeenCalledWith({
                orderId: 'ORDER-123',
                shippingAddress: mockAddress,
                customerInfo: mockCustomerInfo
            });
            expect(mockIdProvider.newDeliveryId).toHaveBeenCalled();
            expect(mockDeliveryRepository.save).toHaveBeenCalled();

            expect(result).toEqual({
                deliveryId: '507f1f77bcf86cd799439011',
                orderId: 'ORDER-123',
                provider: 'NRW',
                labelUrl: 'https://example.com/label.pdf',
                trackingNumber: 'NRW-123456',
                estimatedDelivery: new Date('2025-11-01'),
                status: DeliveryStatus.CONFIRMED
            });
        });

        it('should throw an error when delivery already exists for the order', async () => {
            // Arrange
            const existingDelivery = Delivery.create({
                id: DeliveryId.fromString('507f1f77bcf86cd799439012'),
                orderId: new OrderId('ORDER-123'),
                provider: 'TLS',
                trackingNumber: 'TLS-999',
                status: DeliveryStatus.CONFIRMED,
                labelUrl: 'https://example.com/existing.pdf',
                shippingAddress: mockAddress,
                customerInfo: mockCustomerInfo
            });

            mockDeliveryRepository.findByOrderId.mockResolvedValue(existingDelivery);

            // Act & Assert
            await expect(createDeliveryUseCase.execute(mockInput)).rejects.toThrow(
                'Delivery already exists for order ORDER-123'
            );

            expect(mockDeliveryRepository.findByOrderId).toHaveBeenCalledWith(new OrderId('ORDER-123'));
            expect(mockProviderSelector.selectProvider).not.toHaveBeenCalled();
            expect(mockShippingProvider.generateLabel).not.toHaveBeenCalled();
            expect(mockDeliveryRepository.save).not.toHaveBeenCalled();
        });

        it('should propagate error when shipping provider fails', async () => {
            // Arrange
            mockDeliveryRepository.findByOrderId.mockResolvedValue(null);
            const providerError = new Error('Provider service unavailable');
            mockShippingProvider.generateLabel.mockRejectedValue(providerError);

            // Act & Assert
            await expect(createDeliveryUseCase.execute(mockInput)).rejects.toThrow('Provider service unavailable');

            expect(mockDeliveryRepository.findByOrderId).toHaveBeenCalled();
            expect(mockProviderSelector.selectProvider).toHaveBeenCalled();
            expect(mockShippingProvider.generateLabel).toHaveBeenCalled();
            expect(mockDeliveryRepository.save).not.toHaveBeenCalled();
        });

        it('should propagate error when repository save fails', async () => {
            // Arrange
            mockDeliveryRepository.findByOrderId.mockResolvedValue(null);
            const repositoryError = new Error('Database connection failed');
            mockDeliveryRepository.save.mockRejectedValue(repositoryError);

            // Act & Assert
            await expect(createDeliveryUseCase.execute(mockInput)).rejects.toThrow('Database connection failed');

            expect(mockDeliveryRepository.findByOrderId).toHaveBeenCalled();
            expect(mockProviderSelector.selectProvider).toHaveBeenCalled();
            expect(mockShippingProvider.generateLabel).toHaveBeenCalled();
            expect(mockDeliveryRepository.save).toHaveBeenCalled();
        });

        it('should create delivery with correct properties', async () => {
            // Arrange
            mockDeliveryRepository.findByOrderId.mockResolvedValue(null);
            let savedDelivery: Delivery;
            mockDeliveryRepository.save.mockImplementation(async (delivery: Delivery) => {
                savedDelivery = delivery;
            });

            // Act
            await createDeliveryUseCase.execute(mockInput);

            // Assert
            expect(savedDelivery!).toBeDefined();
            expect(savedDelivery!.id.toString()).toBe('507f1f77bcf86cd799439011');
            expect(savedDelivery!.orderId.toString()).toBe('ORDER-123');
            expect(savedDelivery!.provider).toBe('NRW');
            expect(savedDelivery!.trackingNumber).toBe('NRW-123456');
            expect(savedDelivery!.status).toBe(DeliveryStatus.CONFIRMED);
            expect(savedDelivery!.labelUrl).toBe('https://example.com/label.pdf');
            expect(savedDelivery!.shippingAddress).toEqual(mockAddress);
            expect(savedDelivery!.customerInfo).toEqual(mockCustomerInfo);
        });

        it('should handle provider selector error', async () => {
            // Arrange
            mockDeliveryRepository.findByOrderId.mockResolvedValue(null);
            const selectorError = new Error('No shipping providers available');
            mockProviderSelector.selectProvider.mockImplementation(() => {
                throw selectorError;
            });

            // Act & Assert
            await expect(createDeliveryUseCase.execute(mockInput)).rejects.toThrow('No shipping providers available');

            expect(mockDeliveryRepository.findByOrderId).toHaveBeenCalled();
            expect(mockProviderSelector.selectProvider).toHaveBeenCalled();
            expect(mockShippingProvider.generateLabel).not.toHaveBeenCalled();
            expect(mockDeliveryRepository.save).not.toHaveBeenCalled();
        });

        it('should handle invalid order id format', async () => {
            // Arrange
            const invalidInput = { ...mockInput, orderId: '' };

            // Act & Assert
            await expect(createDeliveryUseCase.execute(invalidInput)).rejects.toThrow();

            expect(mockDeliveryRepository.findByOrderId).not.toHaveBeenCalled();
            expect(mockProviderSelector.selectProvider).not.toHaveBeenCalled();
        });

        it('should use the correct id provider and create delivery with generated id', async () => {
            // Arrange
            const customId = DeliveryId.fromString('507f1f77bcf86cd799439099');
            mockIdProvider.newDeliveryId.mockReturnValue(customId);
            mockDeliveryRepository.findByOrderId.mockResolvedValue(null);

            // Act
            const result = await createDeliveryUseCase.execute(mockInput);

            // Assert
            expect(mockIdProvider.newDeliveryId).toHaveBeenCalled();
            expect(result.deliveryId).toBe(customId.toString());
        });

        it('should pass correct data to shipping provider', async () => {
            // Arrange
            mockDeliveryRepository.findByOrderId.mockResolvedValue(null);

            // Act
            await createDeliveryUseCase.execute(mockInput);

            // Assert
            expect(mockShippingProvider.generateLabel).toHaveBeenCalledWith({
                orderId: mockInput.orderId,
                shippingAddress: mockInput.shippingAddress,
                customerInfo: mockInput.customerInfo
            });
        });
    });
});