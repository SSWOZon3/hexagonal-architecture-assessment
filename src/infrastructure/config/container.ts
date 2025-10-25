import { CreateDeliveryUseCase } from '../../application/useCases/createDelivery.useCase';
import { GetDeliveryStatusUseCase } from '../../application/useCases/getDeliveryStatus.useCase';
import { UpdateDeliveryStatusUseCase } from '../../application/useCases/updateDeliveryStatus.useCase';
import { ProcessWebhookDeliveryStatusUseCase } from '../../application/useCases/processWebhookDeliveryStatus.useCase';
import { MongoDeliveryRepository } from '../repositories/MongoDeliveryRepository';
import { ShippingProviderSelector as ShippingProviderSelectorAdapter } from '../adapters/shippingProviders/ShippingProviderSelector';
import { ShippingProviderSelector } from '../../application/ports/ShippingProviderSelector';
import { MongoObjectIdProvider } from '../ids/MongoObjectIdProvider';
import { IdProvider } from '../../application/ports/IdProvider';
import { DeliveryRepository } from '../../domain/repositories/DeliveryRepository';
import { DeliveryPollingService } from '../adapters/DeliveryPollingService';

export type AppContainer = {
    repositories: {
        deliveryRepository: DeliveryRepository;
    };
    useCases: {
        deliveries: {
            createDeliveryUseCase: CreateDeliveryUseCase;
            getDeliveryStatusUseCase: GetDeliveryStatusUseCase;
            updateDeliveryStatusUseCase: UpdateDeliveryStatusUseCase;
            processWebhookDeliveryStatusUseCase: ProcessWebhookDeliveryStatusUseCase;
        };
    };
    services: {
        deliveryPollingService: DeliveryPollingService;
    };
};

export function buildContainer(): AppContainer {
    const deliveryRepository: DeliveryRepository = new MongoDeliveryRepository();

    const providerSelector: ShippingProviderSelector = new ShippingProviderSelectorAdapter();

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

    const shippingProviders = providerSelector.getAllProviders();

    const deliveryPollingService = new DeliveryPollingService(
        deliveryRepository,
        shippingProviders,
        updateDeliveryStatusUseCase
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
                processWebhookDeliveryStatusUseCase
            },
        },
        services: {
            deliveryPollingService
        }
    };
}
