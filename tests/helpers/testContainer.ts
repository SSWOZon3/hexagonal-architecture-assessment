import { CreateDeliveryUseCase } from '../../src/application/useCases/createDelivery.useCase';
import { GetDeliveryStatusUseCase } from '../../src/application/useCases/getDeliveryStatus.useCase';
import { UpdateDeliveryStatusUseCase } from '../../src/application/useCases/updateDeliveryStatus.useCase';
import { ProcessWebhookDeliveryStatusUseCase } from '../../src/application/useCases/processWebhookDeliveryStatus.useCase';
import { SyncTrackingStatusesUseCase } from '../../src/application/useCases/syncTrackingStatusesUseCase';
import { MongoDeliveryRepository } from '../../src/infrastructure/repositories/MongoDeliveryRepository';
import { MongoObjectIdProvider } from '../../src/infrastructure/ids/MongoObjectIdProvider';
import { IdProvider } from '../../src/application/ports/IdProvider';
import { DeliveryRepository } from '../../src/domain/repositories/DeliveryRepository';
import { DeliveryPollingService } from '../../src/infrastructure/adapters/DeliveryPollingService';
import { ShippingProviderSelector } from '../../src/application/ports/ShippingProviderSelector';
import { MockShippingProviderSelector } from '../mocks/MockShippingProviderSelector';
import { AppContainer } from '../../src/infrastructure/config/container';

export function buildTestContainer(): AppContainer {
    const deliveryRepository: DeliveryRepository = new MongoDeliveryRepository();

    const providerSelector: ShippingProviderSelector = new MockShippingProviderSelector();

    const idProvider: IdProvider = new MongoObjectIdProvider();

    const createDeliveryUseCase = new CreateDeliveryUseCase(
        deliveryRepository,
        providerSelector,
        idProvider,
    );

    const getDeliveryStatusUseCase = new GetDeliveryStatusUseCase(
        deliveryRepository
    );

    const updateDeliveryStatusUseCase = new UpdateDeliveryStatusUseCase(
        deliveryRepository
    );

    const processWebhookDeliveryStatusUseCase = new ProcessWebhookDeliveryStatusUseCase(
        deliveryRepository,
        updateDeliveryStatusUseCase
    );

    const syncTrackingStatusesUseCase = new SyncTrackingStatusesUseCase(
        deliveryRepository,
        updateDeliveryStatusUseCase,
        providerSelector
    );

    const deliveryPollingService = new DeliveryPollingService(
        syncTrackingStatusesUseCase
    );

    return {
        repositories: {
            deliveryRepository
        },
        useCases: {
            deliveries: {
                createDeliveryUseCase,
                getDeliveryStatusUseCase,
                updateDeliveryStatusUseCase,
                processWebhookDeliveryStatusUseCase,
                syncTrackingStatusesUseCase
            },
        },
        services: {
            deliveryPollingService
        }
    };
}