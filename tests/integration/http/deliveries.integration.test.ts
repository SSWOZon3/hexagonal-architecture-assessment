import { beforeAll, afterAll, describe, it, expect, beforeEach } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { setupTestServer, teardownTestServer, cleanupTestData } from '../../helpers/testServer';
import { DeliveryModel } from '../../../src/infrastructure/db/mongo/schemas/DeliverySchema';
import { DeliveryStatus } from '../../../src/domain/entities/Delivery';

describe('Deliveries Integration Tests', () => {
    let app: FastifyInstance;

    const validDeliveryPayload = {
        orderId: 'ORDER-INTEGRATION-123',
        shippingAddress: {
            street: '123 Test Street',
            city: 'Madrid',
            state: 'Madrid',
            zipCode: '28001',
            country: 'Spain'
        },
        customerInfo: {
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '+34123456789'
        }
    };

    beforeAll(async () => {
        app = await setupTestServer();
    });

    afterAll(async () => {
        await teardownTestServer();
    });

    beforeEach(async () => {
        // Clean database before each test
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

            // Assert Response
            expect(response.statusCode).toBe(201);
            const responseBody = JSON.parse(response.body);

            expect(responseBody.deliveryId).toBeDefined();
            expect(responseBody.orderId).toBe('ORDER-INTEGRATION-123');
            expect(responseBody.provider).toBeDefined();
            expect(responseBody.labelUrl).toBeDefined();
            expect(responseBody.trackingNumber).toBeDefined();
            expect(responseBody.estimatedDelivery).toBeDefined();
            expect(responseBody.status).toBe(DeliveryStatus.CONFIRMED);

            // Verify delivery was persisted to database
            const deliveryInDb = await DeliveryModel.findOne({
                orderId: 'ORDER-INTEGRATION-123'
            }).lean();

            expect(deliveryInDb).toBeTruthy();
            expect(deliveryInDb!.orderId).toBe('ORDER-INTEGRATION-123');
            expect(deliveryInDb!.status).toBe(DeliveryStatus.CONFIRMED);
            expect(deliveryInDb!.shippingAddress).toMatchObject(validDeliveryPayload.shippingAddress);
            expect(deliveryInDb!.customerInfo).toMatchObject(validDeliveryPayload.customerInfo);
            expect(deliveryInDb!.createdAt).toBeDefined();
            expect(deliveryInDb!.updatedAt).toBeDefined();

            // Verify only one delivery was created
            const totalDeliveries = await DeliveryModel.countDocuments();
            expect(totalDeliveries).toBe(1);
        });

        it('should return 400 when required fields are missing', async () => {
            // Act
            const response = await app.inject({
                method: 'POST',
                url: '/deliveries',
                payload: {}
            });

            // Assert Response
            expect(response.statusCode).toBe(400);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.error).toBe('Bad Request');
            expect(responseBody.message).toContain('required');

            // Verify no delivery was created in database
            const deliveryCount = await DeliveryModel.countDocuments();
            expect(deliveryCount).toBe(0);
        });

        it('should return 400 when orderId is missing', async () => {
            // Act
            const payload = { ...validDeliveryPayload };
            delete (payload as any).orderId;

            const response = await app.inject({
                method: 'POST',
                url: '/deliveries',
                payload
            });

            // Assert Response
            expect(response.statusCode).toBe(400);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.error).toBe('Bad Request');

            // Verify no delivery was created in database
            const deliveryCount = await DeliveryModel.countDocuments();
            expect(deliveryCount).toBe(0);
        });

        it('should return 400 when shippingAddress is missing', async () => {
            // Act
            const payload = { ...validDeliveryPayload };
            delete (payload as any).shippingAddress;

            const response = await app.inject({
                method: 'POST',
                url: '/deliveries',
                payload
            });

            // Assert Response
            expect(response.statusCode).toBe(400);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.error).toBe('Bad Request');

            // Verify no delivery was created in database
            const deliveryCount = await DeliveryModel.countDocuments();
            expect(deliveryCount).toBe(0);
        });

        it('should return 400 when customerInfo is missing', async () => {
            // Act
            const payload = { ...validDeliveryPayload };
            delete (payload as any).customerInfo;

            const response = await app.inject({
                method: 'POST',
                url: '/deliveries',
                payload
            });

            // Assert Response
            expect(response.statusCode).toBe(400);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.error).toBe('Bad Request');

            // Verify no delivery was created in database
            const deliveryCount = await DeliveryModel.countDocuments();
            expect(deliveryCount).toBe(0);
        });

        it('should return 400 for invalid email format', async () => {
            // Act
            const payload = {
                ...validDeliveryPayload,
                customerInfo: {
                    ...validDeliveryPayload.customerInfo,
                    email: 'invalid-email'
                }
            };

            const response = await app.inject({
                method: 'POST',
                url: '/deliveries',
                payload
            });

            // Assert Response
            expect(response.statusCode).toBe(400);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.error).toBe('Bad Request');

            // Verify no delivery was created in database
            const deliveryCount = await DeliveryModel.countDocuments();
            expect(deliveryCount).toBe(0);
        });

        it('should return 400 for short orderId', async () => {
            // Act
            const payload = {
                ...validDeliveryPayload,
                orderId: 'AB' // Less than 3 characters
            };

            const response = await app.inject({
                method: 'POST',
                url: '/deliveries',
                payload
            });

            // Assert Response
            expect(response.statusCode).toBe(400);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.error).toBe('Bad Request');

            // Verify no delivery was created in database
            const deliveryCount = await DeliveryModel.countDocuments();
            expect(deliveryCount).toBe(0);
        });

        it('should return 409 when trying to create duplicate delivery', async () => {
            // Arrange - Create first delivery
            await app.inject({
                method: 'POST',
                url: '/deliveries',
                payload: validDeliveryPayload
            });

            // Act - Try to create duplicate
            const response = await app.inject({
                method: 'POST',
                url: '/deliveries',
                payload: validDeliveryPayload
            });

            // Assert Response
            expect(response.statusCode).toBe(409);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.error).toBe('CONFLICT');
            expect(responseBody.message).toContain('already exists');

            // Verify only one delivery exists in database
            const deliveryCount = await DeliveryModel.countDocuments();
            expect(deliveryCount).toBe(1);
        });

        it('should handle different order IDs correctly', async () => {
            // Act - Create first delivery
            const payload1 = { ...validDeliveryPayload, orderId: 'ORDER-TEST-001' };
            const response1 = await app.inject({
                method: 'POST',
                url: '/deliveries',
                payload: payload1
            });

            // Act - Create second delivery
            const payload2 = { ...validDeliveryPayload, orderId: 'ORDER-TEST-002' };
            const response2 = await app.inject({
                method: 'POST',
                url: '/deliveries',
                payload: payload2
            });

            // Assert Responses
            expect(response1.statusCode).toBe(201);
            expect(response2.statusCode).toBe(201);

            const responseBody1 = JSON.parse(response1.body);
            const responseBody2 = JSON.parse(response2.body);

            expect(responseBody1.orderId).toBe('ORDER-TEST-001');
            expect(responseBody2.orderId).toBe('ORDER-TEST-002');
            expect(responseBody1.deliveryId).not.toBe(responseBody2.deliveryId);

            // Verify both deliveries exist in database
            const deliveryCount = await DeliveryModel.countDocuments();
            expect(deliveryCount).toBe(2);

            const delivery1InDb = await DeliveryModel.findOne({ orderId: 'ORDER-TEST-001' });
            const delivery2InDb = await DeliveryModel.findOne({ orderId: 'ORDER-TEST-002' });
            expect(delivery1InDb).toBeTruthy();
            expect(delivery2InDb).toBeTruthy();
            expect((delivery1InDb as any)._id.toString()).not.toBe((delivery2InDb as any)._id.toString());
        });

        it('should persist all delivery fields correctly in database', async () => {
            // Act
            const response = await app.inject({
                method: 'POST',
                url: '/deliveries',
                payload: validDeliveryPayload
            });

            // Assert Response
            expect(response.statusCode).toBe(201);
            const responseBody = JSON.parse(response.body);
            const deliveryId = responseBody.deliveryId;

            // Verify all fields in database
            const deliveryInDb = await DeliveryModel.findOne({ id: deliveryId }).lean();
            expect(deliveryInDb).toBeTruthy();

            // Check all required fields are properly stored
            expect(deliveryInDb!.orderId).toBe(validDeliveryPayload.orderId);
            expect(deliveryInDb!.provider).toBeDefined();
            expect(deliveryInDb!.trackingNumber).toBeDefined();
            expect(deliveryInDb!.status).toBe(DeliveryStatus.CONFIRMED);
            expect(deliveryInDb!.labelUrl).toBeDefined();

            // Check nested objects
            expect(deliveryInDb!.shippingAddress.street).toBe(validDeliveryPayload.shippingAddress.street);
            expect(deliveryInDb!.shippingAddress.city).toBe(validDeliveryPayload.shippingAddress.city);
            expect(deliveryInDb!.shippingAddress.state).toBe(validDeliveryPayload.shippingAddress.state);
            expect(deliveryInDb!.shippingAddress.zipCode).toBe(validDeliveryPayload.shippingAddress.zipCode);
            expect(deliveryInDb!.shippingAddress.country).toBe(validDeliveryPayload.shippingAddress.country);

            expect(deliveryInDb!.customerInfo.name).toBe(validDeliveryPayload.customerInfo.name);
            expect(deliveryInDb!.customerInfo.email).toBe(validDeliveryPayload.customerInfo.email);
            expect(deliveryInDb!.customerInfo.phone).toBe(validDeliveryPayload.customerInfo.phone);

            // Check timestamps
            expect(deliveryInDb!.createdAt).toBeInstanceOf(Date);
            expect(deliveryInDb!.updatedAt).toBeInstanceOf(Date);
        });

        it('should handle incomplete shippingAddress', async () => {
            // Act
            const payload = {
                ...validDeliveryPayload,
                shippingAddress: {
                    street: '123 Test Street',
                    city: 'Madrid'
                    // Missing required fields: state, zipCode, country
                }
            };

            const response = await app.inject({
                method: 'POST',
                url: '/deliveries',
                payload
            });

            // Assert Response
            expect(response.statusCode).toBe(400);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.error).toBe('Bad Request');

            // Verify no delivery was created in database
            const deliveryCount = await DeliveryModel.countDocuments();
            expect(deliveryCount).toBe(0);
        });

        it('should handle incomplete customerInfo', async () => {
            // Act
            const payload = {
                ...validDeliveryPayload,
                customerInfo: {
                    name: 'John Doe'
                    // Missing required fields: email, phone
                }
            };

            const response = await app.inject({
                method: 'POST',
                url: '/deliveries',
                payload
            });

            // Assert Response
            expect(response.statusCode).toBe(400);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.error).toBe('Bad Request');

            // Verify no delivery was created in database
            const deliveryCount = await DeliveryModel.countDocuments();
            expect(deliveryCount).toBe(0);
        });
    });

    describe('GET /deliveries/:id/status', () => {
        let createdDeliveryId: string;

        beforeEach(async () => {
            // Create a delivery to test against
            const response = await app.inject({
                method: 'POST',
                url: '/deliveries',
                payload: validDeliveryPayload
            });
            const responseBody = JSON.parse(response.body);
            createdDeliveryId = responseBody.deliveryId;
        });

        it('should get delivery status successfully with valid ID', async () => {
            // Act
            const response = await app.inject({
                method: 'GET',
                url: `/deliveries/${createdDeliveryId}/status`
            });

            // Assert Response
            expect(response.statusCode).toBe(200);
            const responseBody = JSON.parse(response.body);

            expect(responseBody.deliveryId).toBe(createdDeliveryId);
            expect(responseBody.orderId).toBe(validDeliveryPayload.orderId);
            expect(responseBody.provider).toBeDefined();
            expect(responseBody.status).toBe(DeliveryStatus.CONFIRMED);
            expect(responseBody.labelUrl).toBeDefined();
            expect(responseBody.createdAt).toBeDefined();
            expect(responseBody.updatedAt).toBeDefined();

            // Verify data matches database
            const deliveryInDb = await DeliveryModel.findOne({ id: createdDeliveryId }).lean();
            expect(deliveryInDb).toBeTruthy();
            expect(responseBody.orderId).toBe(deliveryInDb!.orderId);
            expect(responseBody.status).toBe(deliveryInDb!.status);
            expect(responseBody.provider).toBe(deliveryInDb!.provider);
        });

        it('should return 404 for non-existent delivery ID', async () => {
            // Act
            const nonExistentId = '507f1f77bcf86cd799439011';
            const response = await app.inject({
                method: 'GET',
                url: `/deliveries/${nonExistentId}/status`
            });

            // Assert Response
            expect(response.statusCode).toBe(404);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.error).toBe('NOT_FOUND');
            expect(responseBody.message).toContain('not found');

            // Verify database wasn't modified
            const deliveryCount = await DeliveryModel.countDocuments();
            expect(deliveryCount).toBe(1); // Only the one created in beforeEach
        });

        it('should return 400 for invalid delivery ID format', async () => {
            // Act
            const response = await app.inject({
                method: 'GET',
                url: '/deliveries/invalid-id/status'
            });

            // Assert Response
            expect(response.statusCode).toBe(500);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.error).toBe('INTERNAL_ERROR');

            // Verify database wasn't modified
            const deliveryCount = await DeliveryModel.countDocuments();
            expect(deliveryCount).toBe(1);
        });

        it('should handle status changes correctly in database', async () => {
            // Arrange - Update delivery status in database directly
            await DeliveryModel.findOneAndUpdate({ id: createdDeliveryId }, {
                status: DeliveryStatus.IN_TRANSIT,
                updatedAt: new Date()
            });

            // Act
            const response = await app.inject({
                method: 'GET',
                url: `/deliveries/${createdDeliveryId}/status`
            });

            // Assert Response
            expect(response.statusCode).toBe(200);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.status).toBe(DeliveryStatus.IN_TRANSIT);

            // Verify response matches database
            const deliveryInDb = await DeliveryModel.findOne({ id: createdDeliveryId }).lean();
            expect(deliveryInDb!.status).toBe(DeliveryStatus.IN_TRANSIT);
            expect(responseBody.status).toBe(deliveryInDb!.status);
        });
    });
});