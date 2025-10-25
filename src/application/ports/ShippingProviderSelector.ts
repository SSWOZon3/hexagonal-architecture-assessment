import { ShippingProvider } from './ShippingProvider';

export interface ShippingProviderSelector {
    selectProvider(): ShippingProvider;
    getAllProviders(): ShippingProvider[];
}
