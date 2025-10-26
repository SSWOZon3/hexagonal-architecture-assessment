import { OrderId } from '../../../../src/domain/value-objects/OrderId';

describe('OrderId Value Object', () => {
    describe('constructor', () => {
        it('should create OrderId with valid string', () => {
            // Arrange
            const validOrderId = 'ORDER-123';

            // Act
            const orderId = new OrderId(validOrderId);

            // Assert
            expect(orderId).toBeInstanceOf(OrderId);
            expect(orderId.toString()).toBe(validOrderId);
        });

        it('should create OrderId with long string', () => {
            // Arrange
            const longOrderId = 'VERY-LONG-ORDER-ID-WITH-MANY-CHARACTERS-123456789';

            // Act
            const orderId = new OrderId(longOrderId);

            // Assert
            expect(orderId).toBeInstanceOf(OrderId);
            expect(orderId.toString()).toBe(longOrderId);
        });

        it('should throw error for invalid values', () => {
            // Act & Assert
            expect(() => new OrderId('')).toThrow('OrderId cannot be empty');
            expect(() => new OrderId('   ')).toThrow('OrderId cannot be empty');
            expect(() => new OrderId(null as any)).toThrow('OrderId cannot be empty');
            expect(() => new OrderId(undefined as any)).toThrow('OrderId cannot be empty');
        });

        it('should validate minimum length and handle various formats', () => {
            // Act & Assert - Length validation
            expect(() => new OrderId('AB')).toThrow('OrderId must be at least 3 characters long');
            expect(() => new OrderId('A')).toThrow('OrderId must be at least 3 characters long');

            // Valid formats
            expect(new OrderId('ORD-123_ABC@test.com').toString()).toBe('ORD-123_ABC@test.com'); // Special chars
            expect(new OrderId('123456789').toString()).toBe('123456789'); // Numbers only
            expect(new OrderId('ORDER 123 ABC').toString()).toBe('ORDER 123 ABC'); // Spaces
        });
    });

    describe('toString', () => {
        it('should return original value and preserve case', () => {
            // Arrange & Act & Assert
            expect(new OrderId('ORDER-456').toString()).toBe('ORDER-456');
            expect(new OrderId('Order-123-ABC').toString()).toBe('Order-123-ABC'); // Case preserved
        });
    });

    describe('equals', () => {
        it('should return true for OrderIds with same value', () => {
            // Arrange
            const value = 'ORDER-789';
            const orderId1 = new OrderId(value);
            const orderId2 = new OrderId(value);

            // Act & Assert
            expect(orderId1.equals(orderId2)).toBe(true);
            expect(orderId2.equals(orderId1)).toBe(true);
        });

        it('should return false for OrderIds with different values', () => {
            // Arrange
            const orderId1 = new OrderId('ORDER-123');
            const orderId2 = new OrderId('ORDER-456');

            // Act & Assert
            expect(orderId1.equals(orderId2)).toBe(false);
            expect(orderId2.equals(orderId1)).toBe(false);
        });
    });
});