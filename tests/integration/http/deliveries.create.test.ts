import { FastifyInstance } from 'fastify';
import { setupTestServer, teardownTestServer, cleanupTestData } from '../../helpers/testServer';
import { DeliveryModel } from '../../../src/infrastructure/db/mongo/schemas/DeliverySchema';
import { DeliveryStatus } from '../../../src/domain/entities/Delivery';

describe('Deliveries Integration Tests', () => {
    let app: FastifyInstance;

    const validDeliveryPayload = {
        orderId: 'ORDER-INTEGRATION-123',
        shippingAddress: {
            street: '123 Integration St',
            city: 'Madrid',
            state: 'Madrid',
            zipCode: '28001',
            country: 'Spain'
        },
        customerInfo: {
            name: 'Juan Pérez Integration',
            email: 'juan.integration@example.com',
            phone: '+34123456789'
        }
    };

    beforeAll(async () => {
        app = await setupTestServer();
    }, 30000);

    afterAll(async () => {
        await teardownTestServer();
    }, 10000);

    beforeEach(async () => {
        await cleanupTestData();
    });

    describe('POST /deliveries', () => {
        it('should create a delivery successfully with valid payload', async () => {
            // Act
            const response = await app.inject({
                method: 'POST',
                url: '/deliveries',
                payload: validDeliveryPayload
            });

            // Assert
            expect(response.statusCode).toBe(201);

            const responseBody = JSON.parse(response.body);
            expect(responseBody.deliveryId).toBeDefined();
            expect(responseBody.orderId).toBe('ORDER-INTEGRATION-123');
            expect(responseBody.provider).toBe('NRW');
            expect(responseBody.labelUrl).toBe('https://api.nrw-shipping.com/labels/NRWINTEGRATION-123.pdf');
            expect(responseBody.trackingNumber).toBe('NRWINTEGRATION-123');
            expect(responseBody.estimatedDelivery).toBe('2025-11-01T10:00:00.000Z');
            expect(responseBody.status).toBe(DeliveryStatus.CONFIRMED);

            const deliveryInDb = await DeliveryModel.findOne({
                orderId: 'ORDER-INTEGRATION-123'
            });
            expect(deliveryInDb).toBeTruthy();
            expect(deliveryInDb?.orderId).toBe('ORDER-INTEGRATION-123');
            expect(deliveryInDb?.status).toBe(DeliveryStatus.CONFIRMED);
            expect(deliveryInDb?.provider).toBe('NRW');
            expect(deliveryInDb?.trackingNumber).toBe('NRWINTEGRATION-123');
        });

        it('should return 400 when orderId is missing', async () => {
            // Arrange
            const invalidPayload = {
                ...validDeliveryPayload,
                orderId: undefined
            };

            // Act
            const response = await app.inject({
                method: 'POST',
                url: '/deliveries',
                payload: invalidPayload
            });

            // Assert
            expect(response.statusCode).toBe(400);

            const responseBody = JSON.parse(response.body);
            expect(responseBody.error).toBe('Bad Request');
            expect(responseBody.message).toBe('body must have required property \'orderId\'');

            // Verify no delivery was created in database
            const deliveryCount = await DeliveryModel.countDocuments();
            expect(deliveryCount).toBe(0);
        });

        it('should return 409 when delivery already exists for orderId', async () => {
            // Arrange - Create initial delivery
            const firstResponse = await app.inject({
                method: 'POST',
                url: '/deliveries',
                payload: validDeliveryPayload
            });
            expect(firstResponse.statusCode).toBe(201);

            // Act - Try to create another delivery with same orderId
            const secondResponse = await app.inject({
                method: 'POST',
                url: '/deliveries',
                payload: validDeliveryPayload
            });

            // Assert
            expect(secondResponse.statusCode).toBe(409);

            const responseBody = JSON.parse(secondResponse.body);
            expect(responseBody.error).toBe('CONFLICT');
            expect(responseBody.message).toContain('already exists for order');

            // Verify only one delivery exists in database
            const deliveryCount = await DeliveryModel.countDocuments({
                orderId: 'ORDER-INTEGRATION-123'
            });
            expect(deliveryCount).toBe(1);
        });

    });
});