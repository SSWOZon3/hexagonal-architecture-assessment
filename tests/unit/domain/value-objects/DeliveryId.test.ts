import { DeliveryId } from '../../../../src/domain/value-objects/DeliveryId';

describe('DeliveryId Value Object', () => {
    describe('fromString', () => {
        it('should create DeliveryId from valid MongoDB ObjectId hex string', () => {
            // Arrange
            const validObjectId = '507f1f77bcf86cd799439011';

            // Act
            const deliveryId = DeliveryId.fromString(validObjectId);

            // Assert
            expect(deliveryId).toBeInstanceOf(DeliveryId);
            expect(deliveryId.toString()).toBe(validObjectId);
            expect(deliveryId.value).toBe(validObjectId);
        });

        it('should create DeliveryId from valid UUID string', () => {
            // Arrange
            const validUuid = '123e4567-e89b-12d3-a456-426614174000';

            // Act
            const deliveryId = DeliveryId.fromString(validUuid);

            // Assert
            expect(deliveryId).toBeInstanceOf(DeliveryId);
            expect(deliveryId.toString()).toBe(validUuid);
            expect(deliveryId.value).toBe(validUuid);
        });

        it('should create DeliveryId from valid ULID string', () => {
            // Arrange
            const validUlid = '01ARZ3NDEKTSV4RRFFQ69G5FAV';

            // Act
            const deliveryId = DeliveryId.fromString(validUlid);

            // Assert
            expect(deliveryId).toBeInstanceOf(DeliveryId);
            expect(deliveryId.toString()).toBe(validUlid);
            expect(deliveryId.value).toBe(validUlid);
        });

        it('should throw error for empty string', () => {
            // Act & Assert
            expect(() => DeliveryId.fromString('')).toThrow('DeliveryId cannot be empty');
        });

        it('should throw error for invalid input values', () => {
            // Act & Assert
            expect(() => DeliveryId.fromString(null as any)).toThrow('DeliveryId cannot be empty');
            expect(() => DeliveryId.fromString(undefined as any)).toThrow('DeliveryId cannot be empty');
            expect(() => DeliveryId.fromString(123 as any)).toThrow('DeliveryId cannot be empty');
        });

        it('should throw error for invalid format strings', () => {
            // Act & Assert
            expect(() => DeliveryId.fromString('507f1f77bcf86cd79943901')).toThrow('DeliveryId format not supported');
            expect(() => DeliveryId.fromString('507f1f77bcf86cd7994390111')).toThrow('DeliveryId format not supported');
            expect(() => DeliveryId.fromString('123e4567-e89b-12d3-a456-42661417400')).toThrow('DeliveryId format not supported');
            expect(() => DeliveryId.fromString('01ARZ3NDEKTSV4RRFFQ69G5FA')).toThrow('DeliveryId format not supported');
        });
    });

    describe('equals', () => {
        it('should return true for DeliveryIds with same value', () => {
            // Arrange
            const value = '507f1f77bcf86cd799439011';
            const deliveryId1 = DeliveryId.fromString(value);
            const deliveryId2 = DeliveryId.fromString(value);

            // Act & Assert
            expect(deliveryId1.equals(deliveryId2)).toBe(true);
            expect(deliveryId2.equals(deliveryId1)).toBe(true);
        });

        it('should return false for DeliveryIds with different values', () => {
            // Arrange
            const deliveryId1 = DeliveryId.fromString('507f1f77bcf86cd799439011');
            const deliveryId2 = DeliveryId.fromString('507f1f77bcf86cd799439012');

            // Act & Assert
            expect(deliveryId1.equals(deliveryId2)).toBe(false);
            expect(deliveryId2.equals(deliveryId1)).toBe(false);
        });
    });

    describe('toString and value methods', () => {
        it('should return and preserve original values correctly', () => {
            // Arrange
            const originalValue = '507f1f77bcf86cd799439011';
            const upperCaseValue = '507F1F77BCF86CD799439011';

            const deliveryId1 = DeliveryId.fromString(originalValue);
            const deliveryId2 = DeliveryId.fromString(upperCaseValue);

            // Act & Assert
            expect(deliveryId1.toString()).toBe(originalValue);
            expect(deliveryId1.value).toBe(originalValue);
            expect(deliveryId1.value).toBe(deliveryId1.toString());

            expect(deliveryId2.toString()).toBe(upperCaseValue);
        });
    });
});