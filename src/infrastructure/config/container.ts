import { CreateDeliveryUseCase } from '../../application/useCases/createDelivery.useCase';
import { GetDeliveryStatusUseCase } from '../../application/useCases/getDeliveryStatus.useCase';
import { UpdateDeliveryStatusUseCase } from '../../application/useCases/updateDeliveryStatus.useCase';
import { MongoDeliveryRepository } from '../repositories/MongoDeliveryRepository';
import { ShippingProviderSelector as ShippingProviderSelectorAdapter } from '../services/shippingProviders/ShippingProviderSelector';
import { ShippingProviderSelector } from '../../domain/services/ShippingProviderSelector';
import { MongoObjectIdProvider } from '../ids/MongoObjectIdProvider';
import { IdProvider } from '../../domain/ports/IdProvider';
import { DeliveryRepository } from '../../domain/repositories/DeliveryRepository';
import { DeliveryPollingService } from '../services/DeliveryPollingService';

export type AppContainer = {
    useCases: {
        deliveries: {
            createDeliveryUseCase: CreateDeliveryUseCase;
            getDeliveryStatusUseCase: GetDeliveryStatusUseCase;
            updateDeliveryStatusUseCase: UpdateDeliveryStatusUseCase;
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

    // Get all shipping providers for polling service
    const shippingProviders = providerSelector.getAllProviders();

    const deliveryPollingService = new DeliveryPollingService(
        deliveryRepository,
        shippingProviders,
        updateDeliveryStatusUseCase
    );

    return {
        useCases: {
            deliveries: {
                createDeliveryUseCase,
                getDeliveryStatusUseCase,
                updateDeliveryStatusUseCase
            },
        },
        services: {
            deliveryPollingService
        }
    };
}
