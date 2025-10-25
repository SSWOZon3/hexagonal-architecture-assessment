export class OrderId {
    constructor(private readonly value: string) {
        this.ensureIsValid(value);
    }

    private ensureIsValid(value: string): void {
        if (!value || value.trim().length === 0) {
            throw new Error('OrderId cannot be empty');
        }
        if (value.length < 3) {
            throw new Error('OrderId must be at least 3 characters long');
        }
    }

    toString(): string {
        return this.value;
    }

    equals(other: OrderId): boolean {
        return this.value === other.value;
    }
}
