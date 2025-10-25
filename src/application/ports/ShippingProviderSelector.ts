// src/domain/services/ShippingProviderSelector.ts
import { ShippingProvider } from './ShippingProvider';

export interface ShippingProviderSelector {
    selectProvider(): ShippingProvider;
    getAllProviders(): ShippingProvider[];
}
