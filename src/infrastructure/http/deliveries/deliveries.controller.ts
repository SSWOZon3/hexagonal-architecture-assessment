import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateDeliveryUseCase, CreateDeliveryInput } from '../../../application/useCases/createDelivery.useCase';
import { GetDeliveryStatusUseCase } from '../../../application/useCases/getDeliveryStatus.useCase';

export class DeliveriesController {
    // TODO: Aprender esto
    constructor(
        private readonly createDeliveryUseCase: CreateDeliveryUseCase,
        private readonly getDeliveryStatusUseCase: GetDeliveryStatusUseCase
    ) {
        this.create = this.create.bind(this);
        this.getStatus = this.getStatus.bind(this);
    }

    async create(req: FastifyRequest, reply: FastifyReply) {
        try {
            const input = req.body as CreateDeliveryInput;

            if (!input.orderId || !input.shippingAddress || !input.customerInfo) {
                return reply.code(400).send({
                    error: 'BAD_REQUEST',
                    message: 'Missing required fields: orderId, shippingAddress, customerInfo'
                });
            }

            const label = await this.createDeliveryUseCase.execute(input);
            console.log('Delivery created successfully:', label);
            return reply.code(201).send({
                success: true,
                data: label
            });
        } catch (err: any) {
            console.error('Error creating delivery:', err);

            // TODO: Improve error handling based on error types in Domain/Application layers
            //       and create a middleware for error handling
            if (err.message.includes('already exists')) {
                return reply.code(409).send({
                    error: 'CONFLICT',
                    message: err.message
                });
            }

            if (err.message.includes('No shipping providers')) {
                return reply.code(503).send({
                    error: 'SERVICE_UNAVAILABLE',
                    message: 'No shipping providers are currently available'
                });
            }

            if (err.message.includes('cannot be empty') || err.message.includes('must be at least')) {
                return reply.code(400).send({
                    error: 'BAD_REQUEST',
                    message: err.message
                });
            }

            return reply.code(500).send({
                error: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred'
            });
        }
    }

    async getStatus(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const { id } = req.params;

            if (!id) {
                return reply.code(400).send({
                    error: 'BAD_REQUEST',
                    message: 'Delivery ID is required'
                });
            }

            const deliveryStatus = await this.getDeliveryStatusUseCase.execute({ deliveryId: id });

            return reply.code(200).send({
                success: true,
                data: deliveryStatus
            });
        } catch (err: any) {
            console.error('Error getting delivery status:', err);

            if (err.message.includes('not found')) {
                return reply.code(404).send({
                    error: 'NOT_FOUND',
                    message: err.message
                });
            }

            return reply.code(500).send({
                error: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred'
            });
        }
    }
}
