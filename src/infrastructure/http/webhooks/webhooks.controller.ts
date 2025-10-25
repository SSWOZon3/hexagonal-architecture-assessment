import { FastifyReply, FastifyRequest } from 'fastify';

export interface WebhookDeliveryStatusInput {
    deliveryId: string;
    status: string;
    provider: string;
    timestamp: string;
    signature?: string;
}

export class WebhooksController {
    constructor() {
        this.handleDeliveryStatus = this.handleDeliveryStatus.bind(this);
    }

    async handleDeliveryStatus(req: FastifyRequest, reply: FastifyReply) {
        try {
            const input = req.body as WebhookDeliveryStatusInput;

            // Validate required fields
            if (!input.deliveryId || !input.status || !input.provider) {
                return reply.code(400).send({
                    error: 'BAD_REQUEST',
                    message: 'Missing required fields: deliveryId, status, provider'
                });
            }

            // TODO: Validate signature from provider for security
            // TODO: Update delivery status using UpdateDeliveryStatusUseCase

            console.log('Webhook received:', input);

            return reply.code(200).send({
                success: true,
                message: 'Webhook processed successfully'
            });
        } catch (err: any) {
            console.error('Error processing webhook:', err);

            return reply.code(500).send({
                error: 'INTERNAL_ERROR',
                message: 'An unexpected error occurred'
            });
        }
    }
}