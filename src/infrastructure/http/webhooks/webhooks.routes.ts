import { FastifyPluginAsync } from 'fastify';
import { WebhooksController } from './webhooks.controller';

// TODO: Add middleware validator for webhook signatures calling /application/policies/WebhookSignatureValidator.ts
const webhooksRoutes: FastifyPluginAsync = async (app) => {
    const container = app.container;
    const controller = new WebhooksController(
        container.useCases.deliveries.processWebhookDeliveryStatusUseCase
    );

    app.post('/delivery-status', {
        schema: {
            description: 'Handle delivery status webhook from shipping providers',
            tags: ['Webhooks'],
            body: {
                type: 'object',
                required: ['trackingNumber', 'status'],
                properties: {
                    trackingNumber: {
                        type: 'string',
                        description: 'Tracking number to identify the delivery'
                    },
                    status: {
                        type: 'string',
                        description: 'New delivery status',
                        enum: ['PENDING', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']
                    },
                    timestamp: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Timestamp of the status update'
                    },
                    signature: {
                        type: 'string',
                        description: 'Webhook signature for validation'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        deliveryId: { type: 'string' },
                        orderId: { type: 'string' },
                        trackingNumber: { type: 'string' },
                        provider: { type: 'string' },
                        previousStatus: { type: 'string' },
                        updatedStatus: { type: 'string' },
                        noChange: { type: 'boolean' }
                    }
                },
                400: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, controller.handleDeliveryStatus);
};

export default webhooksRoutes;