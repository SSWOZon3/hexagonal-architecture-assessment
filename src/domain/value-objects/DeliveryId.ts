export class DeliveryId {
    private constructor(private readonly _value: string) { }

    static fromString(value: string): DeliveryId {
        if (!value || typeof value !== 'string') {
            throw new Error('DeliveryId cannot be empty');
        }

        const isHex24 = /^[0-9a-f]{24}$/i.test(value);
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
        const isUlid = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(value);
        if (!isHex24 && !isUuid && !isUlid) {
            throw new Error('DeliveryId format not supported');
        }
        return new DeliveryId(value);
    }

    equals(other: DeliveryId): boolean {
        return this._value === other._value;
    }

    toString(): string {
        return this._value;
    }

    get value(): string {
        return this._value;
    }
}
