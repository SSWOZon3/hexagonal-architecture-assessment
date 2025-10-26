import { beforeAll, afterAll, describe, it, expect, beforeEach } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { setupTestServer, teardownTestServer, cleanupTestData } from '../../helpers/testServer';
import { DeliveryModel } from '../../../src/infrastructure/db/mongo/schemas/DeliverySchema';
import { DeliveryStatus } from '../../../src/domain/entities/Delivery';

describe('Webhooks Integration Tests', () => {
    let app: FastifyInstance;
    let createdDeliveryId: string;
    let trackingNumber: string;

    const validDeliveryPayload = {
        orderId: 'ORDER-WEBHOOK-TEST',
        shippingAddress: {
            street: '123 Webhook Street',
            city: 'Madrid',
            state: 'Madrid',
            zipCode: '28001',
            country: 'Spain'
        },
        customerInfo: {
            name: 'Webhook Test User',
            email: 'webhook@example.com',
            phone: '+34987654321'
        }
    };

    beforeAll(async () => {
        app = await setupTestServer();
    });

    afterAll(async () => {
        await teardownTestServer();
    });

    beforeEach(async () => {
        await cleanupTestData();

        // Create a delivery to test webhooks against
        const response = await app.inject({
            method: 'POST',
            url: '/deliveries',
            payload: validDeliveryPayload
        });
        const responseBody = JSON.parse(response.body);
        createdDeliveryId = responseBody.deliveryId;
        trackingNumber = responseBody.trackingNumber;
    });

    describe('POST /webhooks/delivery-status', () => {
        it('should process delivery status webhook successfully', async () => {
            // Arrange
            const webhookPayload = {
                trackingNumber: trackingNumber,
                status: DeliveryStatus.IN_TRANSIT,
                timestamp: new Date().toISOString(),
                signature: 'test-signature'
            };

            // Act
            const response = await app.inject({
                method: 'POST',
                url: '/webhooks/delivery-status',
                payload: webhookPayload
            });

            // Assert Response
            expect(response.statusCode).toBe(200);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.message).toBe('Webhook processed successfully');
            expect(responseBody.trackingNumber).toBe(trackingNumber);

            // Verify delivery status was updated in database
            const updatedDelivery = await DeliveryModel.findOne({ id: createdDeliveryId }).lean();
            expect(updatedDelivery).toBeTruthy();
            expect(updatedDelivery!.status).toBe(DeliveryStatus.IN_TRANSIT);
            expect(updatedDelivery!.updatedAt).toBeInstanceOf(Date);

            // Verify updated timestamp is recent
            const now = new Date();
            const updatedAt = new Date(updatedDelivery!.updatedAt);
            const timeDiff = now.getTime() - updatedAt.getTime();
            expect(timeDiff).toBeLessThan(5000); // Less than 5 seconds ago
        });

        it('should return 400 when trackingNumber is missing', async () => {
            // Arrange
            const webhookPayload = {
                status: DeliveryStatus.DELIVERED,
                timestamp: new Date().toISOString()
            };

            // Act
            const response = await app.inject({
                method: 'POST',
                url: '/webhooks/delivery-status',
                payload: webhookPayload
            });

            // Assert Response
            expect(response.statusCode).toBe(400);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.error).toBe('Bad Request');
            expect(responseBody.message).toContain('required');

            // Verify delivery status was NOT changed in database
            const unchangedDelivery = await DeliveryModel.findOne({ id: createdDeliveryId }).lean();
            expect(unchangedDelivery!.status).toBe(DeliveryStatus.CONFIRMED); // Original status
        });

        it('should return 400 when status is missing', async () => {
            // Arrange
            const webhookPayload = {
                trackingNumber: trackingNumber,
                timestamp: new Date().toISOString()
            };

            // Act
            const response = await app.inject({
                method: 'POST',
                url: '/webhooks/delivery-status',
                payload: webhookPayload
            });

            // Assert Response
            expect(response.statusCode).toBe(400);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.error).toBe('Bad Request');
            expect(responseBody.message).toContain('required');

            // Verify delivery status was NOT changed in database
            const unchangedDelivery = await DeliveryModel.findOne({ id: createdDeliveryId }).lean();
            expect(unchangedDelivery!.status).toBe(DeliveryStatus.CONFIRMED); // Original status
        });

        it('should return 404 when delivery with tracking number does not exist', async () => {
            // Arrange
            const webhookPayload = {
                trackingNumber: 'NON-EXISTENT-TRACKING',
                status: DeliveryStatus.DELIVERED,
                timestamp: new Date().toISOString()
            };

            // Act
            const response = await app.inject({
                method: 'POST',
                url: '/webhooks/delivery-status',
                payload: webhookPayload
            });

            // Assert Response
            expect(response.statusCode).toBe(404);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.error).toBe('DELIVERY_NOT_FOUND');
            expect(responseBody.message).toContain('not found');

            // Verify existing delivery was NOT affected
            const unchangedDelivery = await DeliveryModel.findOne({ id: createdDeliveryId }).lean();
            expect(unchangedDelivery!.status).toBe(DeliveryStatus.CONFIRMED); // Original status
        });

        it('should return 400 for invalid delivery status', async () => {
            // Arrange
            const webhookPayload = {
                trackingNumber: trackingNumber,
                status: 'INVALID_STATUS',
                timestamp: new Date().toISOString()
            };

            // Act
            const response = await app.inject({
                method: 'POST',
                url: '/webhooks/delivery-status',
                payload: webhookPayload
            });

            // Assert Response
            expect(response.statusCode).toBe(400);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.error).toBe('Bad Request'); // Schema validation catches this first

            // Verify delivery status was NOT changed in database
            const unchangedDelivery = await DeliveryModel.findOne({ id: createdDeliveryId }).lean();
            expect(unchangedDelivery!.status).toBe(DeliveryStatus.CONFIRMED); // Original status
        });

        it('should return 200 with no change when status is the same', async () => {
            const firstUpdate = await app.inject({
                method: 'POST',
                url: '/webhooks/delivery-status',
                payload: {
                    trackingNumber: trackingNumber,
                    status: DeliveryStatus.IN_TRANSIT,
                    timestamp: new Date().toISOString()
                }
            });
            expect(firstUpdate.statusCode).toBe(200);

            const updatedDelivery = await DeliveryModel.findOne({ id: createdDeliveryId }).lean();
            expect(updatedDelivery!.status).toBe(DeliveryStatus.IN_TRANSIT);

            // Now send same status again - this should trigger no change
            const webhookPayload = {
                trackingNumber: trackingNumber,
                status: DeliveryStatus.IN_TRANSIT,
                timestamp: new Date().toISOString()
            };

            // Act
            const response = await app.inject({
                method: 'POST',
                url: '/webhooks/delivery-status',
                payload: webhookPayload
            });

            // Assert Response
            expect(response.statusCode).toBe(200);
            const responseBody = JSON.parse(response.body);
            console.log('Actual response body:', responseBody);
            expect(responseBody.message).toContain('already has status');

            // Verify delivery status remains the same (IN_TRANSIT, not CONFIRMED)
            const unchangedDelivery = await DeliveryModel.findOne({ id: createdDeliveryId }).lean();
            expect(unchangedDelivery!.status).toBe(DeliveryStatus.IN_TRANSIT);
        });

        it('should handle all valid status transitions', async () => {
            const validStatuses = [
                DeliveryStatus.IN_TRANSIT,
                DeliveryStatus.DELIVERED,
                DeliveryStatus.CANCELLED
            ];

            for (const status of validStatuses) {
                // Arrange - Reset delivery status to CONFIRMED
                await DeliveryModel.updateOne({ id: createdDeliveryId }, {
                    status: DeliveryStatus.CONFIRMED,
                    updatedAt: new Date()
                });

                const webhookPayload = {
                    trackingNumber: trackingNumber,
                    status: status,
                    timestamp: new Date().toISOString()
                };

                // Act
                const response = await app.inject({
                    method: 'POST',
                    url: '/webhooks/delivery-status',
                    payload: webhookPayload
                });

                // Assert Response
                expect(response.statusCode).toBe(200);
                const responseBody = JSON.parse(response.body);
                expect(responseBody.message).toBe('Webhook processed successfully');

                // Verify delivery status was updated in database
                const updatedDelivery = await DeliveryModel.findOne({ id: createdDeliveryId }).lean();
                expect(updatedDelivery!.status).toBe(status);
            }
        });

        it('should work without optional signature field', async () => {
            // Arrange
            const webhookPayload = {
                trackingNumber: trackingNumber,
                status: DeliveryStatus.DELIVERED,
                timestamp: new Date().toISOString()
                // No signature field
            };

            // Act
            const response = await app.inject({
                method: 'POST',
                url: '/webhooks/delivery-status',
                payload: webhookPayload
            });

            // Assert Response
            expect(response.statusCode).toBe(200);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.message).toBe('Webhook processed successfully');

            // Verify delivery status was updated in database
            const updatedDelivery = await DeliveryModel.findOne({ id: createdDeliveryId }).lean();
            expect(updatedDelivery!.status).toBe(DeliveryStatus.DELIVERED);
        });

        it('should work without optional timestamp field', async () => {
            // Arrange
            const webhookPayload = {
                trackingNumber: trackingNumber,
                status: DeliveryStatus.IN_TRANSIT
                // No timestamp field
            };

            // Act
            const response = await app.inject({
                method: 'POST',
                url: '/webhooks/delivery-status',
                payload: webhookPayload
            });

            // Assert Response
            expect(response.statusCode).toBe(200);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.message).toBe('Webhook processed successfully');

            // Verify delivery status was updated in database
            const updatedDelivery = await DeliveryModel.findOne({ id: createdDeliveryId }).lean();
            expect(updatedDelivery!.status).toBe(DeliveryStatus.IN_TRANSIT);
        });

        it('should handle multiple webhook calls for same delivery', async () => {
            // Arrange - First webhook: CONFIRMED -> IN_TRANSIT
            const webhook1 = {
                trackingNumber: trackingNumber,
                status: DeliveryStatus.IN_TRANSIT,
                timestamp: new Date().toISOString()
            };

            // Act - First webhook
            const response1 = await app.inject({
                method: 'POST',
                url: '/webhooks/delivery-status',
                payload: webhook1
            });

            console.log(response1.body);
            expect(response1.statusCode).toBe(200);

            // Arrange - Second webhook: IN_TRANSIT -> DELIVERED
            const webhook2 = {
                trackingNumber: trackingNumber,
                status: DeliveryStatus.DELIVERED,
                timestamp: new Date().toISOString()
            };

            // Act - Second webhook
            const response2 = await app.inject({
                method: 'POST',
                url: '/webhooks/delivery-status',
                payload: webhook2
            });

            // Assert Final Response
            expect(response2.statusCode).toBe(200);

            // Verify final delivery status in database
            const finalDelivery = await DeliveryModel.findOne({ id: createdDeliveryId }).lean();
            expect(finalDelivery!.status).toBe(DeliveryStatus.DELIVERED);
        });

        it('should handle case sensitive status validation', async () => {
            // Arrange - lowercase status should fail schema validation
            const webhookPayload = {
                trackingNumber: trackingNumber,
                status: 'in_transit', // lowercase
                timestamp: new Date().toISOString()
            };

            // Act
            const response = await app.inject({
                method: 'POST',
                url: '/webhooks/delivery-status',
                payload: webhookPayload
            });

            // Assert Response - Should fail schema validation
            expect(response.statusCode).toBe(400);
            const responseBody = JSON.parse(response.body);
            expect(responseBody.error).toBe('Bad Request'); // Fastify schema validation

            // Verify delivery status was NOT changed in database
            const unchangedDelivery = await DeliveryModel.findOne({ id: createdDeliveryId }).lean();
            expect(unchangedDelivery!.status).toBe(DeliveryStatus.CONFIRMED); // Original status
        });

        it('should persist webhook processing results correctly in database', async () => {
            // Arrange
            const originalDelivery = await DeliveryModel.findOne({ id: createdDeliveryId }).lean();
            const originalUpdatedAt = originalDelivery!.updatedAt;

            // Small delay to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 10));

            const webhookPayload = {
                trackingNumber: trackingNumber,
                status: DeliveryStatus.IN_TRANSIT,
                timestamp: new Date().toISOString()
            };

            // Act
            const response = await app.inject({
                method: 'POST',
                url: '/webhooks/delivery-status',
                payload: webhookPayload
            });

            // Assert Response
            expect(response.statusCode).toBe(200);

            // Verify all database changes
            const updatedDelivery = await DeliveryModel.findOne({ id: createdDeliveryId }).lean();

            // Status should be updated
            expect(updatedDelivery!.status).toBe(DeliveryStatus.IN_TRANSIT);

            // UpdatedAt should be changed
            expect(new Date(updatedDelivery!.updatedAt).getTime()).toBeGreaterThan(new Date(originalUpdatedAt).getTime());

            // Other fields should remain unchanged
            expect(updatedDelivery!.orderId).toBe(originalDelivery!.orderId);
            expect(updatedDelivery!.trackingNumber).toBe(originalDelivery!.trackingNumber);
            expect(updatedDelivery!.provider).toBe(originalDelivery!.provider);
            expect(updatedDelivery!.labelUrl).toBe(originalDelivery!.labelUrl);
            expect(updatedDelivery!.createdAt).toEqual(originalDelivery!.createdAt);
        });

        it('should handle malformed JSON payload', async () => {
            // Act
            const response = await app.inject({
                method: 'POST',
                url: '/webhooks/delivery-status',
                payload: 'invalid json',
                headers: {
                    'content-type': 'application/json'
                }
            });

            // Assert Response
            expect(response.statusCode).toBe(400);

            // Verify delivery status was NOT changed in database
            const unchangedDelivery = await DeliveryModel.findOne({ id: createdDeliveryId }).lean();
            expect(unchangedDelivery!.status).toBe(DeliveryStatus.CONFIRMED); // Original status
        });

        it('should handle empty payload', async () => {
            // Act
            const response = await app.inject({
                method: 'POST',
                url: '/webhooks/delivery-status',
                payload: {}
            });

            // Assert Response
            expect(response.statusCode).toBe(400);

            // Verify delivery status was NOT changed in database
            const unchangedDelivery = await DeliveryModel.findOne({ id: createdDeliveryId }).lean();
            expect(unchangedDelivery!.status).toBe(DeliveryStatus.CONFIRMED); // Original status
        });
    });
});