// src/domain/services/ShippingProviderSelector.ts
import { ShippingProvider } from '../ports/ShippingProvider';

export interface ShippingProviderSelector {
    selectProvider(): ShippingProvider;
    getAllProviders(): ShippingProvider[];
}