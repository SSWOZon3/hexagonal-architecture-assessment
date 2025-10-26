import { ShippingProviderSelector as ShippingProviderSelectorInterface } from '../../src/application/ports/ShippingProviderSelector';
import { ShippingProvider } from '../../src/application/ports/ShippingProvider';
import { MockNRWShippingProvider } from './MockNRWShippingProvider';
import { MockTLSShippingProvider } from './MockTLSShippingProvider';

export class MockShippingProviderSelector implements ShippingProviderSelectorInterface {
    private providers: ShippingProvider[];

    constructor() {
        this.providers = [
            new MockNRWShippingProvider(),
            new MockTLSShippingProvider()
        ];
    }

    selectProvider(): ShippingProvider {
        return this.providers[0];
    }

    getAllProviders(): ShippingProvider[] {
        return [...this.providers];
    }
}