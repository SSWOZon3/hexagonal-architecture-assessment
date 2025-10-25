import { FastifyPluginAsync } from 'fastify';
import { WebhooksController } from './webhooks.controller';

const webhooksRoutes: FastifyPluginAsync = async (app) => {
    const controller = new WebhooksController();

    app.post('/delivery-status', {
        schema: {
            description: 'Handle delivery status webhook from shipping providers',
            tags: ['Webhooks'],
            body: {
                type: 'object',
                required: ['deliveryId', 'status', 'provider'],
                properties: {
                    deliveryId: {
                        type: 'string',
                        description: 'Delivery ID to update'
                    },
                    status: {
                        type: 'string',
                        description: 'New delivery status',
                        enum: ['PENDING', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']
                    },
                    provider: {
                        type: 'string',
                        description: 'Shipping provider name'
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
                        message: { type: 'string' }
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