import { ShippingProviderSelector as ShippingProviderSelectorInterface } from '../../../domain/services/ShippingProviderSelector';
import { ShippingProvider } from '../../../domain/ports/ShippingProvider';
import { NRWShippingProvider } from './NRWShippingProvider';
import { TLSShippingProvider } from './TLSShippingProvider';

export class ShippingProviderSelector implements ShippingProviderSelectorInterface {
    private providers: ShippingProvider[];

    constructor() {
        this.providers = [
            new NRWShippingProvider(),
            new TLSShippingProvider()
        ];
    }

    selectProvider(): ShippingProvider {
        // Filter available providers
        const availableProviders = this.providers.filter(provider => provider.isAvailable());

        if (availableProviders.length === 0) {
            throw new Error('No shipping providers are currently available');
        }

        // Select randomly from available providers
        const randomIndex = Math.floor(Math.random() * availableProviders.length);
        return availableProviders[randomIndex];
    }

    getAllProviders(): ShippingProvider[] {
        return [...this.providers];
    }
}
