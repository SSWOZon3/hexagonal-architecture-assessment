import { FastifyPluginAsync } from 'fastify';
import { DeliveriesController } from './deliveries.controller';

const deliveriesRoutes: FastifyPluginAsync = async (app) => {
    const { createDeliveryUseCase, getDeliveryStatusUseCase } = app.container.useCases.deliveries;
    const controller = new DeliveriesController(createDeliveryUseCase, getDeliveryStatusUseCase);

    app.post('/', {
        schema: {
            description: 'Create a new delivery',
            tags: ['Deliveries'],
            body: {
                type: 'object',
                required: ['orderId', 'shippingAddress', 'customerInfo'],
                properties: {
                    orderId: {
                        type: 'string',
                        description: 'Unique order identifier',
                        minLength: 3
                    },
                    shippingAddress: {
                        type: 'object',
                        required: ['street', 'city', 'state', 'zipCode', 'country'],
                        properties: {
                            street: { type: 'string' },
                            city: { type: 'string' },
                            state: { type: 'string' },
                            zipCode: { type: 'string' },
                            country: { type: 'string' }
                        }
                    },
                    customerInfo: {
                        type: 'object',
                        required: ['name', 'email', 'phone'],
                        properties: {
                            name: { type: 'string' },
                            email: { type: 'string', format: 'email' },
                            phone: { type: 'string' }
                        }
                    }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                deliveryId: { type: 'string' },
                                orderId: { type: 'string' },
                                provider: { type: 'string' },
                                labelUrl: { type: 'string' },
                                trackingNumber: { type: 'string' },
                                estimatedDelivery: { type: 'string', format: 'date-time' },
                                status: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, controller.create);

    app.get('/:id/status', {
        schema: {
            description: 'Get delivery status by ID',
            tags: ['Deliveries'],
            params: {
                type: 'object',
                required: ['id'],
                properties: {
                    id: {
                        type: 'string',
                        description: 'Delivery ID'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        data: {
                            type: 'object',
                            properties: {
                                deliveryId: { type: 'string' },
                                orderId: { type: 'string' },
                                provider: { type: 'string' },
                                status: { type: 'string' },
                                labelUrl: { type: 'string' },
                                createdAt: { type: 'string', format: 'date-time' },
                                updatedAt: { type: 'string', format: 'date-time' }
                            }
                        }
                    }
                },
                404: {
                    type: 'object',
                    properties: {
                        error: { type: 'string' },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, controller.getStatus);
};

export default deliveriesRoutes;
